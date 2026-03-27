import { Router } from "express";
import { db, usersTable, codEscrowSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

async function requireOwner(req: any, res: any, next: any) {
  if (!req.session?.userId) return res.status(401).json({ error: "Not authenticated" });
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId)).limit(1);
  if (!u || u.role !== "owner") return res.status(403).json({ error: "Owner access required" });
  next();
}

async function getSettings() {
  const rows = await db.select().from(codEscrowSettingsTable).limit(1);
  if (rows.length > 0) return rows[0];
  const [row] = await db.insert(codEscrowSettingsTable).values({}).returning();
  return row;
}

// GET /cod-escrow — public
router.get("/cod-escrow", async (_req, res) => {
  try {
    const s = await getSettings();
    return res.json({
      ...s,
      highValueThreshold: parseFloat(s.highValueThreshold),
    });
  } catch {
    return res.status(500).json({ error: "Failed to fetch CoD escrow settings" });
  }
});

// PUT /cod-escrow — owner only
router.put("/cod-escrow", requireOwner, async (req, res) => {
  try {
    const { enabled, highValueThreshold, commitmentFeePct } = req.body;
    const current = await getSettings();
    const [updated] = await db.update(codEscrowSettingsTable).set({
      enabled:            typeof enabled            === "boolean" ? enabled            : current.enabled,
      highValueThreshold: typeof highValueThreshold === "number"  ? String(highValueThreshold) : current.highValueThreshold,
      commitmentFeePct:   typeof commitmentFeePct   === "number"  ? commitmentFeePct   : current.commitmentFeePct,
      updatedAt: new Date(),
    }).where(eq(codEscrowSettingsTable.id, current.id)).returning();
    return res.json({ ...updated, highValueThreshold: parseFloat(updated.highValueThreshold) });
  } catch {
    return res.status(500).json({ error: "Failed to update CoD escrow settings" });
  }
});

export default router;
