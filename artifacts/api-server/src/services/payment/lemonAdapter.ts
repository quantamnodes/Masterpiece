import { logger } from "../../lib/logger";
import type { PaymentAdapter, WebhookResult } from "./paymentService";

export const lemonAdapter: PaymentAdapter = {
  async createCheckoutSession(amount: number, currency: string, userEmail: string) {
    logger.info({ amount, currency, userEmail }, "[lemonsqueezy] createCheckoutSession");

    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    const storeId = process.env.LEMONSQUEEZY_STORE_ID;
    const variantId = process.env.LEMONSQUEEZY_VARIANT_ID;
    if (!apiKey || !storeId || !variantId) {
      throw new Error("LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_STORE_ID, and LEMONSQUEEZY_VARIANT_ID must be set");
    }

    const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/vnd.api+json",
        Accept: "application/vnd.api+json",
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: {
              email: userEmail,
              custom: { amount, currency },
            },
            checkout_options: {
              button_color: "#00F0FF",
            },
            product_options: {
              redirect_url: process.env.PAYMENT_SUCCESS_URL ?? "https://example.com/success",
            },
          },
          relationships: {
            store: { data: { type: "stores", id: storeId } },
            variant: { data: { type: "variants", id: variantId } },
          },
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`[lemonsqueezy] createCheckoutSession failed: ${await res.text()}`);
    }

    const data = (await res.json()) as { data: { attributes: { url: string } } };
    const checkoutUrl = data.data.attributes.url;
    logger.info({ checkoutUrl }, "[lemonsqueezy] checkout created");
    return { checkoutUrl };
  },

  async verifyWebhook(requestBody: Buffer | string, signatureHeader: string): Promise<WebhookResult> {
    logger.info("[lemonsqueezy] verifyWebhook");

    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    if (!secret) throw new Error("LEMONSQUEEZY_WEBHOOK_SECRET is not set");

    const crypto = await import("crypto");
    const rawBody = typeof requestBody === "string" ? requestBody : requestBody.toString("utf8");
    const hmac = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

    if (hmac !== signatureHeader) {
      logger.warn("[lemonsqueezy] webhook signature mismatch");
      return { status: "failed", transactionId: "", userEmail: "" };
    }

    const payload = JSON.parse(rawBody) as {
      meta: { event_name: string };
      data: {
        id: string;
        attributes: { user_email?: string; first_order_item?: { order_id: number } };
      };
    };

    if (payload.meta.event_name !== "order_created") {
      return { status: "failed", transactionId: String(payload.data.id), userEmail: "" };
    }

    return {
      status: "success",
      transactionId: String(payload.data.id),
      userEmail: payload.data.attributes.user_email ?? "",
    };
  },
};
