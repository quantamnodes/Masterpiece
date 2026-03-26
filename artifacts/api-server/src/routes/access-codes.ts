import { Router } from "express";
import { db, accessCodesTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

function requireOwner(req: any, res: any, next: any) {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  db.select().from(usersTable).where(eq(usersTable.id, req.session.userId)).limit(1).then(([user]) => {
    if (!user || user.role !== "owner") return res.status(403).json({ error: "Owner access required" });
    (req as any).currentUser = user;
    next();
  }).catch(() => res.status(500).json({ error: "Auth check failed" }));
}

function generateCode(type: string, branchId?: number): string {
  const prefix = type === "owner" ? "AXM-OWN" : type === "manager" ? "AXM-MGR" : "AXM-EMP";
  const branch = branchId ? `SH${branchId}-` : "";
  const rand = crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
  const year = new Date().getFullYear();
  return `${prefix}-${branch}${rand}-${year}`;
}

// GET /access-codes — list all codes (owner only)
router.get("/access-codes", requireOwner, async (_req, res) => {
  try {
    const codes = await db.select().from(accessCodesTable).orderBy(desc(accessCodesTable.createdAt));
    res.json(codes);
  } catch {
    res.status(500).json({ error: "Failed to fetch access codes" });
  }
});

// POST /access-codes — create a new code (owner only)
router.post("/access-codes", requireOwner, async (req, res) => {
  try {
    const { type, branchId, label, expiresAt } = req.body;
    if (!type || !["owner", "manager", "employee"].includes(type)) {
      return res.status(400).json({ error: "type must be owner, manager, or employee" });
    }
    const code = generateCode(type, branchId);
    const [created] = await db.insert(accessCodesTable).values({
      code,
      type,
      branchId: branchId || null,
      createdBy: (req as any).currentUser.id,
      label: label || "",
      active: true,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    }).returning();
    res.status(201).json(created);
  } catch {
    res.status(500).json({ error: "Failed to create access code" });
  }
});

// PUT /access-codes/:id/toggle — enable/disable a code (owner only)
router.put("/access-codes/:id/toggle", requireOwner, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [code] = await db.select().from(accessCodesTable).where(eq(accessCodesTable.id, id)).limit(1);
    if (!code) return res.status(404).json({ error: "Code not found" });
    const [updated] = await db.update(accessCodesTable)
      .set({ active: !code.active })
      .where(eq(accessCodesTable.id, id))
      .returning();
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to toggle access code" });
  }
});

// DELETE /access-codes/:id — delete a code (owner only)
router.delete("/access-codes/:id", requireOwner, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(accessCodesTable).where(eq(accessCodesTable.id, id));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to delete access code" });
  }
});

export default router;
