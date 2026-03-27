import { Router } from "express";
import { getDbAdapter } from "../services/db/dbService";
import { getPaymentAdapter } from "../services/payment/paymentService";
import { logger } from "../lib/logger";

const router = Router();

/**
 * POST /api/checkout
 *
 * Initialises a payment session via the active payment provider.
 * Saves a transaction intent in the active database provider beforehand.
 *
 * Body: { amount: number, currency?: string, userEmail: string }
 * Response: { checkoutUrl: string }
 */
router.post("/checkout", async (req, res) => {
  const body = req.body as { amount?: unknown; currency?: unknown; userEmail?: unknown };

  const amount = Number(body.amount);
  const currency = typeof body.currency === "string" ? body.currency.toUpperCase() : "USD";
  const userEmail = typeof body.userEmail === "string" ? body.userEmail.trim() : "";

  if (!amount || amount <= 0) {
    res.status(400).json({ error: "Invalid request body", details: "amount must be a positive number" });
    return;
  }
  if (!userEmail || !userEmail.includes("@")) {
    res.status(400).json({ error: "Invalid request body", details: "userEmail must be a valid email" });
    return;
  }
  if (currency.length !== 3) {
    res.status(400).json({ error: "Invalid request body", details: "currency must be a 3-letter ISO code" });
    return;
  }

  try {
    const db = getDbAdapter();
    const payment = getPaymentAdapter();

    await db.saveTransactionIntent(userEmail, amount);

    const { checkoutUrl } = await payment.createCheckoutSession(amount, currency, userEmail);

    res.json({ checkoutUrl });
  } catch (err) {
    logger.error({ err }, "POST /checkout error");
    res.status(500).json({ error: "Checkout session creation failed", message: (err as Error).message });
  }
});

export default router;
