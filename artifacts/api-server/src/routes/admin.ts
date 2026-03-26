import { Router } from "express";
import { db, productsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

async function requireAdmin(req: any, res: any, next: any) {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId)).limit(1);
  if (!user || (user.role !== "admin" && user.role !== "owner")) return res.status(403).json({ error: "Owner access required" });
  next();
}

function formatProduct(p: typeof productsTable.$inferSelect) {
  return {
    id: p.id, name: p.name, slug: p.slug, category: p.category, categorySlug: p.categorySlug,
    shortDescription: p.shortDescription, description: p.description,
    basePrice: parseFloat(p.basePrice), salePrice: p.salePrice ? parseFloat(p.salePrice) : null,
    stock: p.stock, sku: p.sku, imageUrl: p.imageUrl, badge: p.badge,
    specs: Array.isArray(p.specs) ? p.specs : [],
    variants: Array.isArray(p.variants) ? p.variants : [],
    tags: Array.isArray(p.tags) ? p.tags : [],
    createdAt: p.createdAt.toISOString(),
  };
}

// GET /admin/products — list all products
router.get("/admin/products", requireAdmin, async (req, res) => {
  try {
    const products = await db.select().from(productsTable).orderBy(productsTable.id);
    return res.json({ products: products.map(formatProduct) });
  } catch {
    return res.status(500).json({ error: "Failed to fetch products" });
  }
});

// POST /admin/products — create product
router.post("/admin/products", requireAdmin, async (req, res) => {
  try {
    const {
      name, slug, categorySlug, category, shortDescription, description,
      basePrice, salePrice, stock, sku, imageUrl, badge, specs, variants, tags,
    } = req.body;

    if (!name || !slug || !categorySlug || !category || !basePrice || !sku) {
      return res.status(400).json({ error: "name, slug, category, categorySlug, basePrice and sku are required" });
    }

    const [product] = await db.insert(productsTable).values({
      name, slug, categorySlug, category,
      shortDescription: shortDescription || "",
      description: description || "",
      basePrice: String(basePrice),
      salePrice: salePrice ? String(salePrice) : null,
      stock: stock || 0,
      sku,
      imageUrl: imageUrl || `https://picsum.photos/seed/${slug}/800/600`,
      badge: badge || null,
      specs: specs || [],
      variants: variants || [],
      tags: tags || [],
    }).returning();

    return res.status(201).json({ product: formatProduct(product) });
  } catch (e: any) {
    if (e?.message?.includes("unique")) {
      return res.status(409).json({ error: "A product with that slug or SKU already exists" });
    }
    return res.status(500).json({ error: "Failed to create product" });
  }
});

// PUT /admin/products/:id — update full product
router.put("/admin/products/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid product id" });

    const {
      name, slug, categorySlug, category, shortDescription, description,
      basePrice, salePrice, stock, sku, imageUrl, badge, specs, variants, tags,
    } = req.body;

    const [updated] = await db.update(productsTable).set({
      ...(name && { name }),
      ...(slug && { slug }),
      ...(categorySlug && { categorySlug }),
      ...(category && { category }),
      ...(shortDescription !== undefined && { shortDescription }),
      ...(description !== undefined && { description }),
      ...(basePrice !== undefined && { basePrice: String(basePrice) }),
      ...(salePrice !== undefined && { salePrice: salePrice ? String(salePrice) : null }),
      ...(stock !== undefined && { stock }),
      ...(sku && { sku }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(badge !== undefined && { badge: badge || null }),
      ...(specs !== undefined && { specs }),
      ...(variants !== undefined && { variants }),
      ...(tags !== undefined && { tags }),
    }).where(eq(productsTable.id, id)).returning();

    if (!updated) return res.status(404).json({ error: "Product not found" });
    return res.json({ product: formatProduct(updated) });
  } catch {
    return res.status(500).json({ error: "Failed to update product" });
  }
});

// DELETE /admin/products/:id — delete product
router.delete("/admin/products/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid product id" });
    await db.delete(productsTable).where(eq(productsTable.id, id));
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: "Failed to delete product" });
  }
});

// PATCH /admin/products/:id/price — update price only
router.patch("/admin/products/:id/price", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid product id" });
    const { basePrice, salePrice } = req.body;
    const [updated] = await db.update(productsTable).set({
      ...(basePrice !== undefined && { basePrice: String(basePrice) }),
      ...(salePrice !== undefined && { salePrice: salePrice ? String(salePrice) : null }),
    }).where(eq(productsTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Product not found" });
    return res.json({ product: formatProduct(updated) });
  } catch {
    return res.status(500).json({ error: "Failed to update price" });
  }
});

export default router;
