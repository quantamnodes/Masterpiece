import { Router } from "express";
import { db, usersTable, searchSlangTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

async function requireOwner(req: any, res: any, next: any) {
  if (!req.session?.userId) return res.status(401).json({ error: "Not authenticated" });
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId)).limit(1);
  if (!u || u.role !== "owner") return res.status(403).json({ error: "Owner access required" });
  next();
}

// GET /search/slang — public, returns all mappings
router.get("/search/slang", async (_req, res) => {
  try {
    const rows = await db.select().from(searchSlangTable).orderBy(searchSlangTable.term);
    return res.json(rows);
  } catch {
    return res.status(500).json({ error: "Failed to fetch slang mappings" });
  }
});

// POST /search/slang — owner only, add or update a mapping
router.post("/search/slang", requireOwner, async (req, res) => {
  try {
    const { term, mapsTo } = req.body;
    if (!term || !mapsTo) return res.status(400).json({ error: "term and mapsTo are required" });
    const existing = await db.select().from(searchSlangTable).where(eq(searchSlangTable.term, term.toLowerCase().trim())).limit(1);
    if (existing.length > 0) {
      const [updated] = await db.update(searchSlangTable).set({ mapsTo }).where(eq(searchSlangTable.id, existing[0].id)).returning();
      return res.json(updated);
    }
    const [created] = await db.insert(searchSlangTable).values({ term: term.toLowerCase().trim(), mapsTo }).returning();
    return res.json(created);
  } catch {
    return res.status(500).json({ error: "Failed to save mapping" });
  }
});

// DELETE /search/slang/:id — owner only
router.delete("/search/slang/:id", requireOwner, async (req, res) => {
  try {
    await db.delete(searchSlangTable).where(eq(searchSlangTable.id, parseInt(req.params.id)));
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: "Failed to delete mapping" });
  }
});

export default router;
