import express, { Router, type Request, type Response } from "express";
import { getDbAdapter } from "../services/db/dbService";
import { getPaymentAdapter } from "../services/payment/paymentService";
import { logger } from "../lib/logger";

const router = Router();

/**
 * POST /api/webhook
 *
 * Universal payment webhook receiver.
 * Validates the provider signature, then grants user access on success.
 *
 * The raw request body is required for signature verification — this route
 * intentionally reads `req.body` as a Buffer (configured in app.ts).
 */
router.post(
  "/webhook",
  (req: Request, res: Response) => {
    void (async () => {
      const signatureHeader =
        (req.headers["stripe-signature"] as string) ||
        (req.headers["x-lemonsqueezy-signature"] as string) ||
        (req.headers["x-paypal-transmission-sig"] as string) ||
        (req.headers["x-amarpay-signature"] as string) ||
        (req.headers["x-sslcommerz-signature"] as string) ||
        "";

      const rawBody: Buffer | string =
        (req as express.Request & { rawBody?: Buffer }).rawBody ?? (req.body as Buffer | string);

      try {
        const payment = getPaymentAdapter();
        const result = await payment.verifyWebhook(rawBody, signatureHeader);

        if (result.status !== "success") {
          logger.warn({ result }, "Webhook verification failed — ignoring event");
          res.status(200).json({ received: true, processed: false });
          return;
        }

        const db = getDbAdapter();
        await db.grantUserAccess(result.userEmail, result.transactionId);

        logger.info(
          { transactionId: result.transactionId, userEmail: result.userEmail },
          "Webhook processed — access granted",
        );

        res.status(200).json({ received: true, processed: true });
      } catch (err) {
        logger.error({ err }, "POST /webhook error");
        res.status(500).json({ error: "Webhook processing failed", message: (err as Error).message });
      }
    })();
  },
);

export default router;
