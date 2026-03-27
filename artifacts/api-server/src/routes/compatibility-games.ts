import { Router } from "express";
import { db, usersTable, compatibilityGamesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

async function requireOwner(req: any, res: any, next: any) {
  if (!req.session?.userId) return res.status(401).json({ error: "Not authenticated" });
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId)).limit(1);
  if (!u || u.role !== "owner") return res.status(403).json({ error: "Owner access required" });
  next();
}

// GET /compatibility-games — public
router.get("/compatibility-games", async (_req, res) => {
  try {
    const games = await db.select().from(compatibilityGamesTable).orderBy(compatibilityGamesTable.name);
    return res.json(games);
  } catch {
    return res.status(500).json({ error: "Failed to fetch games" });
  }
});

// POST /compatibility-games — owner only
router.post("/compatibility-games", requireOwner, async (req, res) => {
  try {
    const { name, slug, categorySlug, specField, minSpec, recSpec, imageUrl } = req.body;
    if (!name || !slug || !categorySlug) return res.status(400).json({ error: "name, slug, categorySlug required" });
    const [created] = await db.insert(compatibilityGamesTable).values({
      name, slug, categorySlug,
      specField: specField || "",
      minSpec:   minSpec   || "",
      recSpec:   recSpec   || "",
      imageUrl:  imageUrl  || "",
    }).returning();
    return res.json(created);
  } catch {
    return res.status(500).json({ error: "Failed to create game" });
  }
});

// PUT /compatibility-games/:id — owner only
router.put("/compatibility-games/:id", requireOwner, async (req, res) => {
  try {
    const { name, slug, categorySlug, specField, minSpec, recSpec, imageUrl, active } = req.body;
    const [updated] = await db.update(compatibilityGamesTable).set({
      ...(name         !== undefined && { name }),
      ...(slug         !== undefined && { slug }),
      ...(categorySlug !== undefined && { categorySlug }),
      ...(specField    !== undefined && { specField }),
      ...(minSpec      !== undefined && { minSpec }),
      ...(recSpec      !== undefined && { recSpec }),
      ...(imageUrl     !== undefined && { imageUrl }),
      ...(active       !== undefined && { active }),
    }).where(eq(compatibilityGamesTable.id, parseInt(req.params.id))).returning();
    return res.json(updated);
  } catch {
    return res.status(500).json({ error: "Failed to update game" });
  }
});

// DELETE /compatibility-games/:id — owner only
router.delete("/compatibility-games/:id", requireOwner, async (req, res) => {
  try {
    await db.delete(compatibilityGamesTable).where(eq(compatibilityGamesTable.id, parseInt(req.params.id)));
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: "Failed to delete game" });
  }
});

export default router;
