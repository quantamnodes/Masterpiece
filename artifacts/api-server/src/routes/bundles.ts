import { Router } from "express";
import { db, usersTable, bundlesTable, bundleItemsTable, productsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

const router = Router();

async function requireOwner(req: any, res: any, next: any) {
  if (!req.session?.userId) return res.status(401).json({ error: "Not authenticated" });
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId)).limit(1);
  if (!u || u.role !== "owner") return res.status(403).json({ error: "Owner access required" });
  next();
}

async function enrichBundle(bundle: typeof bundlesTable.$inferSelect) {
  const items = await db.select().from(bundleItemsTable).where(eq(bundleItemsTable.bundleId, bundle.id));
  const productIds = items.map((i) => i.productId);
  const products = productIds.length > 0
    ? await db.select().from(productsTable).where(inArray(productsTable.id, productIds))
    : [];
  const itemsWithProducts = items.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    const base = product ? parseFloat(product.basePrice) : 0;
    return {
      ...item,
      product: product ? {
        ...product,
        basePrice: base,
        salePrice: product.salePrice ? parseFloat(product.salePrice) : null,
      } : null,
    };
  });
  const subtotal = itemsWithProducts.reduce((sum, i) => {
    const price = (i.product?.salePrice ?? i.product?.basePrice ?? 0);
    return sum + price * i.quantity;
  }, 0);
  const bundlePrice = parseFloat((subtotal * (1 - bundle.discountPct / 100)).toFixed(2));
  return { ...bundle, items: itemsWithProducts, subtotal, bundlePrice };
}

// GET /bundles — public, all active bundles
router.get("/bundles", async (_req, res) => {
  try {
    const all = await db.select().from(bundlesTable).where(eq(bundlesTable.active, true));
    const enriched = await Promise.all(all.map(enrichBundle));
    return res.json(enriched);
  } catch {
    return res.status(500).json({ error: "Failed to fetch bundles" });
  }
});

// GET /bundles/all — owner only, all bundles including inactive
router.get("/bundles/all", requireOwner, async (_req, res) => {
  try {
    const all = await db.select().from(bundlesTable);
    const enriched = await Promise.all(all.map(enrichBundle));
    return res.json(enriched);
  } catch {
    return res.status(500).json({ error: "Failed to fetch bundles" });
  }
});

// GET /bundles/:slug — public
router.get("/bundles/:slug", async (req, res) => {
  try {
    const [bundle] = await db.select().from(bundlesTable).where(eq(bundlesTable.slug, req.params.slug)).limit(1);
    if (!bundle) return res.status(404).json({ error: "Bundle not found" });
    return res.json(await enrichBundle(bundle));
  } catch {
    return res.status(500).json({ error: "Failed to fetch bundle" });
  }
});

// POST /bundles — owner only
router.post("/bundles", requireOwner, async (req, res) => {
  try {
    const { name, slug, description, badgeText, discountPct, imageUrl, productIds } = req.body;
    if (!name || !slug) return res.status(400).json({ error: "name and slug required" });
    const [bundle] = await db.insert(bundlesTable).values({
      name, slug,
      description: description || "",
      badgeText:   badgeText   || "BUNDLE DEAL",
      discountPct: discountPct || 5,
      imageUrl:    imageUrl    || "",
    }).returning();
    if (Array.isArray(productIds) && productIds.length > 0) {
      await db.insert(bundleItemsTable).values(
        productIds.map((pid: number) => ({ bundleId: bundle.id, productId: pid, quantity: 1 }))
      );
    }
    return res.json(await enrichBundle(bundle));
  } catch {
    return res.status(500).json({ error: "Failed to create bundle" });
  }
});

// PUT /bundles/:id — owner only
router.put("/bundles/:id", requireOwner, async (req, res) => {
  try {
    const { name, slug, description, badgeText, discountPct, imageUrl, active, productIds } = req.body;
    const [bundle] = await db.update(bundlesTable).set({
      ...(name        !== undefined && { name }),
      ...(slug        !== undefined && { slug }),
      ...(description !== undefined && { description }),
      ...(badgeText   !== undefined && { badgeText }),
      ...(discountPct !== undefined && { discountPct }),
      ...(imageUrl    !== undefined && { imageUrl }),
      ...(active      !== undefined && { active }),
    }).where(eq(bundlesTable.id, parseInt(req.params.id))).returning();
    if (Array.isArray(productIds)) {
      await db.delete(bundleItemsTable).where(eq(bundleItemsTable.bundleId, bundle.id));
      if (productIds.length > 0) {
        await db.insert(bundleItemsTable).values(
          productIds.map((pid: number) => ({ bundleId: bundle.id, productId: pid, quantity: 1 }))
        );
      }
    }
    return res.json(await enrichBundle(bundle));
  } catch {
    return res.status(500).json({ error: "Failed to update bundle" });
  }
});

// DELETE /bundles/:id — owner only
router.delete("/bundles/:id", requireOwner, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(bundleItemsTable).where(eq(bundleItemsTable.bundleId, id));
    await db.delete(bundlesTable).where(eq(bundlesTable.id, id));
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: "Failed to delete bundle" });
  }
});

export default router;
