import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { productsTable, categoriesTable } from "@workspace/db";
import { eq, ilike, and, gte, lte, gt, sql } from "drizzle-orm";

const router: IRouter = Router();

type ProductRow = typeof productsTable.$inferSelect;
type CategoryRow = typeof categoriesTable.$inferSelect;

function formatProduct(p: ProductRow) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    category: p.category,
    categorySlug: p.categorySlug,
    shortDescription: p.shortDescription,
    description: p.description,
    basePrice: parseFloat(p.basePrice),
    salePrice: p.salePrice ? parseFloat(p.salePrice) : null,
    stock: p.stock,
    sku: p.sku,
    imageUrl: p.imageUrl,
    badge: p.badge,
    specs: Array.isArray(p.specs) ? p.specs : [],
    variants: Array.isArray(p.variants) ? p.variants : [],
    tags: Array.isArray(p.tags) ? p.tags : [],
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/products", async (req, res) => {
  try {
    const { category, socket, formFactor, wattage, memorySpeed, storageCapacity, minPrice, maxPrice, inStockOnly, search, sortBy } =
      req.query as Record<string, string>;

    const conditions = [];

    if (category) {
      conditions.push(eq(productsTable.categorySlug, category));
    }

    if (minPrice) {
      conditions.push(gte(productsTable.basePrice, minPrice));
    }

    if (maxPrice) {
      conditions.push(lte(productsTable.basePrice, maxPrice));
    }

    if (inStockOnly === "true") {
      conditions.push(gt(productsTable.stock, 0));
    }

    if (search) {
      conditions.push(ilike(productsTable.name, `%${search}%`));
    }

    let products = await db
      .select()
      .from(productsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    if (socket) {
      products = products.filter((p) => {
        const specs = Array.isArray(p.specs) ? (p.specs as Array<{ name: string; value: string }>) : [];
        return specs.some(
          (s) =>
            s.name.toLowerCase().includes("socket") &&
            s.value.toLowerCase().includes(socket.toLowerCase()),
        );
      });
    }

    if (formFactor) {
      products = products.filter((p) => {
        const specs = Array.isArray(p.specs) ? (p.specs as Array<{ name: string; value: string }>) : [];
        return specs.some(
          (s) =>
            (s.name.toLowerCase().includes("form") ||
              s.name.toLowerCase().includes("factor")) &&
            s.value.toLowerCase().includes(formFactor.toLowerCase()),
        );
      });
    }

    if (wattage) {
      products = products.filter((p) => {
        const specs = Array.isArray(p.specs) ? (p.specs as Array<{ name: string; value: string }>) : [];
        return specs.some(
          (s) =>
            s.name.toLowerCase() === "wattage" &&
            s.value.toLowerCase().includes(wattage.toLowerCase()),
        );
      });
    }

    if (memorySpeed) {
      products = products.filter((p) => {
        const specs = Array.isArray(p.specs) ? (p.specs as Array<{ name: string; value: string }>) : [];
        return specs.some(
          (s) =>
            (s.name.toLowerCase() === "speed" || s.name.toLowerCase().includes("memory speed")) &&
            s.value.toLowerCase().includes(memorySpeed.toLowerCase()),
        );
      });
    }

    if (storageCapacity) {
      products = products.filter((p) => {
        const specs = Array.isArray(p.specs) ? (p.specs as Array<{ name: string; value: string }>) : [];
        return specs.some(
          (s) =>
            s.name.toLowerCase() === "capacity" &&
            s.value.toLowerCase().includes(storageCapacity.toLowerCase()),
        );
      });
    }

    if (sortBy === "price_asc") {
      products.sort((a, b) => parseFloat(a.basePrice) - parseFloat(b.basePrice));
    } else if (sortBy === "price_desc") {
      products.sort((a, b) => parseFloat(b.basePrice) - parseFloat(a.basePrice));
    } else if (sortBy === "name_asc") {
      products.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "newest") {
      products.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    res.json({
      products: products.map(formatProduct),
      total: products.length,
      page: 1,
      limit: products.length,
    });
  } catch (err) {
    req.log.error({ err }, "Error listing products");
    res.status(500).json({ error: "internal_error", message: "Failed to list products" });
  }
});

router.get("/products/:id", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] ?? "0");
    if (isNaN(id)) {
      res.status(400).json({ error: "bad_request", message: "Invalid product ID" });
      return;
    }

    const products = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, id))
      .limit(1);

    if (products.length === 0) {
      res.status(404).json({ error: "not_found", message: "Product not found" });
      return;
    }

    res.json(formatProduct(products[0]!));
  } catch (err) {
    req.log.error({ err }, "Error getting product");
    res.status(500).json({ error: "internal_error", message: "Failed to get product" });
  }
});

router.get("/products/:id/related", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] ?? "0");
    if (isNaN(id)) {
      res.status(400).json({ error: "bad_request", message: "Invalid product ID" });
      return;
    }

    const sourceProducts = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, id))
      .limit(1);

    if (sourceProducts.length === 0) {
      res.json({ products: [], total: 0, page: 1, limit: 4 });
      return;
    }

    const source = sourceProducts[0]!;
    const related = await db
      .select()
      .from(productsTable)
      .where(
        and(
          eq(productsTable.categorySlug, source.categorySlug),
          sql`${productsTable.id} != ${id}`,
        ),
      )
      .limit(4);

    res.json({
      products: related.map(formatProduct),
      total: related.length,
      page: 1,
      limit: 4,
    });
  } catch (err) {
    req.log.error({ err }, "Error getting related products");
    res.status(500).json({ error: "internal_error", message: "Failed to get related products" });
  }
});

const COMPATIBLE_CATEGORIES: Record<string, string[]> = {
  gpus: ["psus", "cpus"],
  cpus: ["motherboards", "memory"],
  motherboards: ["cpus", "memory", "storage"],
  memory: ["motherboards", "cpus"],
  storage: ["motherboards", "psus"],
  psus: ["gpus", "cpus"],
};

// GET /products/:id/similar — same category, sorted by price (expensive first)
router.get("/products/:id/similar", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] ?? "0");
    if (isNaN(id)) return res.status(400).json({ error: "bad_request" });
    const [source] = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
    if (!source) return res.json({ products: [] });

    const similar = await db
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.categorySlug, source.categorySlug), sql`${productsTable.id} != ${id}`))
      .limit(12);

    // Sort by price desc (premium options first)
    similar.sort((a, b) => parseFloat(b.basePrice) - parseFloat(a.basePrice));

    return res.json({ products: similar.slice(0, 4).map(formatProduct) });
  } catch (err) {
    return res.status(500).json({ error: "Failed to get similar products" });
  }
});

// GET /products/:id/compatible — cross-category compatible hardware
router.get("/products/:id/compatible", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] ?? "0");
    if (isNaN(id)) return res.status(400).json({ error: "bad_request" });
    const [source] = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
    if (!source) return res.json({ products: [] });

    const compatCats = COMPATIBLE_CATEGORIES[source.categorySlug] || [];
    if (compatCats.length === 0) return res.json({ products: [] });

    // Fetch 2 from each compatible category
    const results: (typeof productsTable.$inferSelect)[] = [];
    for (const cat of compatCats.slice(0, 2)) {
      const catProducts = await db
        .select()
        .from(productsTable)
        .where(and(eq(productsTable.categorySlug, cat), sql`${productsTable.id} != ${id}`))
        .limit(2);
      results.push(...catProducts);
    }

    return res.json({ products: results.slice(0, 4).map(formatProduct) });
  } catch (err) {
    return res.status(500).json({ error: "Failed to get compatible products" });
  }
});

router.get("/categories", async (req, res) => {
  try {
    const categories: CategoryRow[] = await db.select().from(categoriesTable);

    const categoryCounts = await db
      .select({
        categorySlug: productsTable.categorySlug,
        count: sql<number>`count(*)::int`,
      })
      .from(productsTable)
      .groupBy(productsTable.categorySlug);

    const countMap = new Map(categoryCounts.map((c) => [c.categorySlug, c.count]));

    res.json({
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        count: countMap.get(c.slug) ?? 0,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Error listing categories");
    res.status(500).json({ error: "internal_error", message: "Failed to list categories" });
  }
});

export default router;
