import { Router } from "express";
import { db, usersTable, customerBenefitsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

async function requireOwner(req: any, res: any, next: any) {
  if (!req.session?.userId) return res.status(401).json({ error: "Not authenticated" });
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId)).limit(1);
  if (!user || user.role !== "owner") return res.status(403).json({ error: "Owner access required" });
  next();
}

async function getSettings() {
  const rows = await db.select().from(customerBenefitsTable).limit(1);
  if (rows.length > 0) return rows[0];
  const [row] = await db.insert(customerBenefitsTable).values({}).returning();
  return row;
}

// GET /api/customer-benefits — public (used by Account page)
router.get("/customer-benefits", async (_req, res) => {
  try {
    const s = await getSettings();
    return res.json(s);
  } catch {
    return res.status(500).json({ error: "Failed to fetch customer benefits" });
  }
});

// PUT /api/customer-benefits — owner only
router.put("/customer-benefits", requireOwner, async (req, res) => {
  try {
    const {
      tierBenefitsVisible,
      bronzeDiscount,
      silverDiscount,
      goldDiscount,
      platinumDiscount,
      bronzeNext,
      silverNext,
      goldNext,
    } = req.body;

    const current = await getSettings();

    const [updated] = await db
      .update(customerBenefitsTable)
      .set({
        tierBenefitsVisible: typeof tierBenefitsVisible === "boolean" ? tierBenefitsVisible : current.tierBenefitsVisible,
        bronzeDiscount:   typeof bronzeDiscount   === "number" ? bronzeDiscount   : current.bronzeDiscount,
        silverDiscount:   typeof silverDiscount   === "number" ? silverDiscount   : current.silverDiscount,
        goldDiscount:     typeof goldDiscount     === "number" ? goldDiscount     : current.goldDiscount,
        platinumDiscount: typeof platinumDiscount === "number" ? platinumDiscount : current.platinumDiscount,
        bronzeNext:       typeof bronzeNext       === "number" ? bronzeNext       : current.bronzeNext,
        silverNext:       typeof silverNext       === "number" ? silverNext       : current.silverNext,
        goldNext:         typeof goldNext         === "number" ? goldNext         : current.goldNext,
        updatedAt: new Date(),
      })
      .where(eq(customerBenefitsTable.id, current.id))
      .returning();

    return res.json(updated);
  } catch {
    return res.status(500).json({ error: "Failed to update customer benefits" });
  }
});

export default router;
