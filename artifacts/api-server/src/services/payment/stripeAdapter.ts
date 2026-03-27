import { logger } from "../../lib/logger";
import type { PaymentAdapter, WebhookResult } from "./paymentService";

export const stripeAdapter: PaymentAdapter = {
  async createCheckoutSession(amount: number, currency: string, userEmail: string) {
    logger.info({ amount, currency, userEmail }, "[stripe] createCheckoutSession");

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const successUrl = process.env.PAYMENT_SUCCESS_URL ?? "https://example.com/success";
    const cancelUrl = process.env.PAYMENT_CANCEL_URL ?? "https://example.com/cancel";

    const params = new URLSearchParams({
      "payment_method_types[]": "card",
      "line_items[0][price_data][currency]": currency.toLowerCase(),
      "line_items[0][price_data][unit_amount]": String(Math.round(amount * 100)),
      "line_items[0][price_data][product_data][name]": "AxiomCraft Order",
      "line_items[0][quantity]": "1",
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: userEmail,
    });

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      throw new Error(`[stripe] createCheckoutSession failed: ${await res.text()}`);
    }

    const session = (await res.json()) as { url: string };
    logger.info({ url: session.url }, "[stripe] checkout session created");
    return { checkoutUrl: session.url };
  },

  async verifyWebhook(requestBody: Buffer | string, signatureHeader: string): Promise<WebhookResult> {
    logger.info("[stripe] verifyWebhook");

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    const crypto = await import("crypto");
    const parts = String(signatureHeader).split(",");
    const tPart = parts.find((p) => p.startsWith("t="));
    const v1Part = parts.find((p) => p.startsWith("v1="));

    if (!tPart || !v1Part) {
      return { status: "failed", transactionId: "", userEmail: "" };
    }

    const timestamp = tPart.slice(2);
    const signature = v1Part.slice(3);
    const payload = `${timestamp}.${typeof requestBody === "string" ? requestBody : requestBody.toString("utf8")}`;
    const expected = crypto
      .createHmac("sha256", webhookSecret)
      .update(payload)
      .digest("hex");

    if (expected !== signature) {
      logger.warn("[stripe] webhook signature mismatch");
      return { status: "failed", transactionId: "", userEmail: "" };
    }

    const event = JSON.parse(typeof requestBody === "string" ? requestBody : requestBody.toString("utf8")) as {
      type: string;
      data: { object: { payment_intent: string; customer_email?: string; customer_details?: { email?: string } } };
    };

    if (event.type !== "checkout.session.completed") {
      return { status: "failed", transactionId: event.data.object.payment_intent, userEmail: "" };
    }

    const userEmail =
      event.data.object.customer_email ??
      event.data.object.customer_details?.email ??
      "";

    return {
      status: "success",
      transactionId: event.data.object.payment_intent,
      userEmail,
    };
  },
};
