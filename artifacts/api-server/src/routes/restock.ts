import { Router } from "express";
import { db, restockNotificationsTable, productsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  next();
}

// POST /restock-notify — subscribe to restock alert for a product
router.post("/restock-notify", async (req, res) => {
  try {
    const { productId, email } = req.body;
    if (!productId || !email) return res.status(400).json({ error: "productId and email required" });
    const pid = parseInt(productId);
    if (isNaN(pid)) return res.status(400).json({ error: "Invalid productId" });

    const existing = await db
      .select()
      .from(restockNotificationsTable)
      .where(
        and(
          eq(restockNotificationsTable.productId, pid),
          eq(restockNotificationsTable.email, email.toLowerCase().trim()),
        ),
      )
      .limit(1);

    if (existing.length > 0) return res.json({ ok: true, alreadySubscribed: true });

    await db.insert(restockNotificationsTable).values({
      userId: req.session.userId ?? null,
      productId: pid,
      email: email.toLowerCase().trim(),
    });
    return res.status(201).json({ ok: true });
  } catch {
    return res.status(500).json({ error: "Failed to subscribe" });
  }
});

// GET /restock-notify/check/:productId — check if email/user already subscribed
router.get("/restock-notify/check/:productId", async (req, res) => {
  try {
    const pid = parseInt(req.params.productId);
    const email = (req.query.email as string | undefined)?.toLowerCase().trim();
    if (isNaN(pid)) return res.status(400).json({ error: "Invalid productId" });

    const conditions: any[] = [eq(restockNotificationsTable.productId, pid)];
    if (email) conditions.push(eq(restockNotificationsTable.email, email));
    else if (req.session.userId) conditions.push(eq(restockNotificationsTable.userId, req.session.userId));
    else return res.json({ subscribed: false });

    const rows = await db
      .select()
      .from(restockNotificationsTable)
      .where(and(...conditions))
      .limit(1);

    return res.json({ subscribed: rows.length > 0 });
  } catch {
    return res.status(500).json({ error: "Failed to check subscription" });
  }
});

export default router;
