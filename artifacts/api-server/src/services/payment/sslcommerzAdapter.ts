import { logger } from "../../lib/logger";
import type { PaymentAdapter, WebhookResult } from "./paymentService";

export const sslcommerzAdapter: PaymentAdapter = {
  async createCheckoutSession(amount: number, currency: string, userEmail: string) {
    logger.info({ amount, currency, userEmail }, "[sslcommerz] createCheckoutSession");

    const storeId = process.env.SSLCOMMERZ_STORE_ID;
    const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
    if (!storeId || !storePassword) {
      throw new Error("SSLCOMMERZ_STORE_ID or SSLCOMMERZ_STORE_PASSWORD is not set");
    }

    const isSandbox = process.env.SSLCOMMERZ_SANDBOX !== "false";
    const baseUrl = isSandbox
      ? "https://sandbox.sslcommerz.com/gwprocess/v4/api.php"
      : "https://securepay.sslcommerz.com/gwprocess/v4/api.php";

    const transId = `TXN-${Date.now()}`;

    const params = new URLSearchParams({
      store_id: storeId,
      store_passwd: storePassword,
      total_amount: String(amount),
      currency: currency.toUpperCase(),
      tran_id: transId,
      success_url: process.env.PAYMENT_SUCCESS_URL ?? "https://example.com/success",
      fail_url: process.env.PAYMENT_CANCEL_URL ?? "https://example.com/cancel",
      cancel_url: process.env.PAYMENT_CANCEL_URL ?? "https://example.com/cancel",
      ipn_url: process.env.SSLCOMMERZ_IPN_URL ?? "https://example.com/api/webhook",
      cus_name: userEmail,
      cus_email: userEmail,
      cus_phone: "N/A",
      cus_add1: "N/A",
      cus_city: "N/A",
      cus_country: "Bangladesh",
      shipping_method: "NO",
      product_name: "AxiomCraft Order",
      product_category: "Hardware",
      product_profile: "general",
    });

    const res = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!res.ok) {
      throw new Error(`[sslcommerz] createCheckoutSession failed: ${await res.text()}`);
    }

    const data = (await res.json()) as { status: string; GatewayPageURL?: string };
    if (data.status !== "SUCCESS" || !data.GatewayPageURL) {
      throw new Error(`[sslcommerz] session creation unsuccessful: ${JSON.stringify(data)}`);
    }

    logger.info({ checkoutUrl: data.GatewayPageURL }, "[sslcommerz] checkout session created");
    return { checkoutUrl: data.GatewayPageURL };
  },

  async verifyWebhook(requestBody: Buffer | string, _signatureHeader: string): Promise<WebhookResult> {
    logger.info("[sslcommerz] verifyWebhook (IPN)");

    const storeId = process.env.SSLCOMMERZ_STORE_ID;
    const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
    if (!storeId || !storePassword) {
      throw new Error("SSLCOMMERZ_STORE_ID or SSLCOMMERZ_STORE_PASSWORD is not set");
    }

    const params =
      typeof requestBody === "string"
        ? new URLSearchParams(requestBody)
        : new URLSearchParams(requestBody.toString("utf8"));

    const valId = params.get("val_id");
    const tranId = params.get("tran_id") ?? "";
    const cusEmail = params.get("cus_email") ?? "";
    const status = params.get("status");

    if (status !== "VALID" || !valId) {
      return { status: "failed", transactionId: tranId, userEmail: cusEmail };
    }

    const isSandbox = process.env.SSLCOMMERZ_SANDBOX !== "false";
    const validationUrl = isSandbox
      ? `https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php`
      : `https://securepay.sslcommerz.com/validator/api/validationserverAPI.php`;

    const validationRes = await fetch(
      `${validationUrl}?val_id=${valId}&store_id=${storeId}&store_passwd=${storePassword}&format=json`,
    );

    if (!validationRes.ok) {
      return { status: "failed", transactionId: tranId, userEmail: cusEmail };
    }

    const validation = (await validationRes.json()) as { status: string };

    if (validation.status !== "VALID" && validation.status !== "VALIDATED") {
      return { status: "failed", transactionId: tranId, userEmail: cusEmail };
    }

    return { status: "success", transactionId: tranId, userEmail: cusEmail };
  },
};
