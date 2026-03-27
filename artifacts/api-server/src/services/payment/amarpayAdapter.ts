import { logger } from "../../lib/logger";
import type { PaymentAdapter, WebhookResult } from "./paymentService";

export const amarpayAdapter: PaymentAdapter = {
  async createCheckoutSession(amount: number, currency: string, userEmail: string) {
    logger.info({ amount, currency, userEmail }, "[amarpay] createCheckoutSession");

    const storeId = process.env.AMARPAY_STORE_ID;
    const signatureKey = process.env.AMARPAY_SIGNATURE_KEY;
    if (!storeId || !signatureKey) throw new Error("AMARPAY_STORE_ID or AMARPAY_SIGNATURE_KEY is not set");

    const isSandbox = process.env.AMARPAY_SANDBOX === "true";
    const baseUrl = isSandbox
      ? "https://sandbox.aamarpay.com/index.php"
      : "https://secure.aamarpay.com/index.php";

    const successUrl = process.env.PAYMENT_SUCCESS_URL ?? "https://example.com/success";
    const failUrl = process.env.PAYMENT_CANCEL_URL ?? "https://example.com/cancel";
    const cancelUrl = failUrl;

    const transId = `TXN-${Date.now()}`;

    const params = new URLSearchParams({
      store_id: storeId,
      tran_id: transId,
      success_url: successUrl,
      fail_url: failUrl,
      cancel_url: cancelUrl,
      amount: String(amount),
      currency: currency.toUpperCase(),
      cus_name: userEmail,
      cus_email: userEmail,
      cus_phone: "N/A",
      cus_add1: "N/A",
      cus_city: "N/A",
      cus_country: "Bangladesh",
      desc: "AxiomCraft Order",
      signature_key: signatureKey,
      type: "json",
    });

    const res = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!res.ok) {
      throw new Error(`[amarpay] createCheckoutSession failed: ${await res.text()}`);
    }

    const data = (await res.json()) as { payment_url?: string };
    const checkoutUrl = data.payment_url ?? "";
    logger.info({ checkoutUrl }, "[amarpay] checkout session created");
    return { checkoutUrl };
  },

  async verifyWebhook(requestBody: Buffer | string, _signatureHeader: string): Promise<WebhookResult> {
    logger.info("[amarpay] verifyWebhook");

    const body =
      typeof requestBody === "string"
        ? (JSON.parse(requestBody) as Record<string, string>)
        : (JSON.parse(requestBody.toString("utf8")) as Record<string, string>);

    if (body.pay_status !== "Successful") {
      return { status: "failed", transactionId: body.mer_txnid ?? "", userEmail: body.cus_email ?? "" };
    }

    return {
      status: "success",
      transactionId: body.pg_txnid ?? body.mer_txnid ?? "",
      userEmail: body.cus_email ?? "",
    };
  },
};
