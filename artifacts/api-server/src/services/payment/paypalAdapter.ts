import { logger } from "../../lib/logger";
import type { PaymentAdapter, WebhookResult } from "./paymentService";

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) throw new Error("PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET is not set");

  const isSandbox = process.env.PAYPAL_SANDBOX !== "false";
  const baseUrl = isSandbox ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";

  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) throw new Error(`[paypal] token fetch failed: ${await res.text()}`);

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export const paypalAdapter: PaymentAdapter = {
  async createCheckoutSession(amount: number, currency: string, userEmail: string) {
    logger.info({ amount, currency, userEmail }, "[paypal] createCheckoutSession");

    const isSandbox = process.env.PAYPAL_SANDBOX !== "false";
    const baseUrl = isSandbox ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
    const accessToken = await getAccessToken();

    const res = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: currency.toUpperCase(),
              value: amount.toFixed(2),
            },
            description: "AxiomCraft Order",
          },
        ],
        payer: { email_address: userEmail },
        application_context: {
          return_url: process.env.PAYMENT_SUCCESS_URL ?? "https://example.com/success",
          cancel_url: process.env.PAYMENT_CANCEL_URL ?? "https://example.com/cancel",
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`[paypal] createCheckoutSession failed: ${await res.text()}`);
    }

    const order = (await res.json()) as { id: string; links: Array<{ rel: string; href: string }> };
    const approveLink = order.links.find((l) => l.rel === "approve");
    if (!approveLink) throw new Error("[paypal] no approve link in order response");

    logger.info({ checkoutUrl: approveLink.href }, "[paypal] order created");
    return { checkoutUrl: approveLink.href };
  },

  async verifyWebhook(requestBody: Buffer | string, signatureHeader: string): Promise<WebhookResult> {
    logger.info("[paypal] verifyWebhook");

    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) throw new Error("PAYPAL_WEBHOOK_ID is not set");

    const rawBody = typeof requestBody === "string" ? requestBody : requestBody.toString("utf8");

    const payload = JSON.parse(rawBody) as {
      event_type: string;
      resource: {
        id: string;
        payer?: { email_address?: string };
        purchase_units?: Array<{ payments?: { captures?: Array<{ id: string }> } }>;
      };
    };

    if (payload.event_type !== "CHECKOUT.ORDER.APPROVED" && payload.event_type !== "PAYMENT.CAPTURE.COMPLETED") {
      return { status: "failed", transactionId: payload.resource.id, userEmail: "" };
    }

    const transactionId =
      payload.resource.purchase_units?.[0]?.payments?.captures?.[0]?.id ??
      payload.resource.id;
    const userEmail = payload.resource.payer?.email_address ?? "";

    return { status: "success", transactionId, userEmail };
  },
};
