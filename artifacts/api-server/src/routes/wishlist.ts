import { Router } from "express";
import { db, usersTable, wishlistsTable, productsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  next();
}

// GET /wishlist — list user's saved products
router.get("/wishlist", requireAuth, async (req, res) => {
  try {
    const items = await db
      .select({
        id: wishlistsTable.id,
        productId: wishlistsTable.productId,
        createdAt: wishlistsTable.createdAt,
        name: productsTable.name,
        slug: productsTable.slug,
        category: productsTable.category,
        basePrice: productsTable.basePrice,
        salePrice: productsTable.salePrice,
        imageUrl: productsTable.imageUrl,
        badge: productsTable.badge,
        stock: productsTable.stock,
      })
      .from(wishlistsTable)
      .innerJoin(productsTable, eq(wishlistsTable.productId, productsTable.id))
      .where(eq(wishlistsTable.userId, req.session.userId!))
      .orderBy(wishlistsTable.createdAt);
    return res.json({ items });
  } catch {
    return res.status(500).json({ error: "Failed to fetch wishlist" });
  }
});

// POST /wishlist/:productId — add to wishlist
router.post("/wishlist/:productId", requireAuth, async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    if (isNaN(productId)) return res.status(400).json({ error: "Invalid product" });

    const existing = await db
      .select()
      .from(wishlistsTable)
      .where(and(eq(wishlistsTable.userId, req.session.userId!), eq(wishlistsTable.productId, productId)))
      .limit(1);

    if (existing.length > 0) return res.json({ ok: true, alreadyAdded: true });

    await db.insert(wishlistsTable).values({ userId: req.session.userId!, productId });
    return res.status(201).json({ ok: true });
  } catch {
    return res.status(500).json({ error: "Failed to add to wishlist" });
  }
});

// DELETE /wishlist/:productId — remove from wishlist
router.delete("/wishlist/:productId", requireAuth, async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    if (isNaN(productId)) return res.status(400).json({ error: "Invalid product" });
    await db
      .delete(wishlistsTable)
      .where(and(eq(wishlistsTable.userId, req.session.userId!), eq(wishlistsTable.productId, productId)));
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: "Failed to remove from wishlist" });
  }
});

export default router;
