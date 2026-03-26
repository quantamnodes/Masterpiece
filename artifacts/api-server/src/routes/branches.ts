import { Router } from "express";
import { db, branchesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function requireOwner(req: any, res: any, next: any) {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  db.select().from(usersTable).where(eq(usersTable.id, req.session.userId)).limit(1).then(([user]) => {
    if (!user || user.role !== "owner") return res.status(403).json({ error: "Owner access required" });
    (req as any).currentUser = user;
    next();
  }).catch(() => res.status(500).json({ error: "Auth check failed" }));
}

// GET /branches — all branches (public)
router.get("/branches", async (_req, res) => {
  try {
    const branches = await db.select().from(branchesTable).orderBy(branchesTable.id);
    res.json(branches);
  } catch {
    res.status(500).json({ error: "Failed to fetch branches" });
  }
});

// POST /branches — create branch (owner only)
router.post("/branches", requireOwner, async (req, res) => {
  try {
    const { name, location, contact, managerId } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    const [branch] = await db.insert(branchesTable).values({
      name,
      location: location || "",
      contact: contact || "",
      managerId: managerId || null,
    }).returning();
    res.status(201).json(branch);
  } catch {
    res.status(500).json({ error: "Failed to create branch" });
  }
});

// PUT /branches/:id — update branch (owner only)
router.put("/branches/:id", requireOwner, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, location, contact, managerId, active } = req.body;
    const [branch] = await db.update(branchesTable)
      .set({
        ...(name !== undefined && { name }),
        ...(location !== undefined && { location }),
        ...(contact !== undefined && { contact }),
        ...(managerId !== undefined && { managerId: managerId || null }),
        ...(active !== undefined && { active }),
      })
      .where(eq(branchesTable.id, id))
      .returning();
    if (!branch) return res.status(404).json({ error: "Branch not found" });
    res.json(branch);
  } catch {
    res.status(500).json({ error: "Failed to update branch" });
  }
});

// DELETE /branches/:id — delete branch (owner only)
router.delete("/branches/:id", requireOwner, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(branchesTable).where(eq(branchesTable.id, id));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to delete branch" });
  }
});

export default router;
