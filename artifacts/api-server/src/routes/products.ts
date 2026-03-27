import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { productsTable, categoriesTable, usersTable, productSaleEventsTable } from "@workspace/db";
import { eq, ilike, and, gte, lte, gt, sql, count } from "drizzle-orm";

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

/* ── Auth helpers ── */

async function requireOwnerOrManager(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId)).limit(1);
  if (!user || (user.role !== "owner" && user.role !== "admin" && user.role !== "manager")) {
    res.status(403).json({ error: "Manager or Owner access required" });
    return;
  }
  next();
}

async function requireOwner(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId)).limit(1);
  if (!user || (user.role !== "owner" && user.role !== "admin")) {
    res.status(403).json({ error: "Owner access required" });
    return;
  }
  next();
}

/* ─────────────────────────────────────────────────────────────────────────
   PRODUCTS — READ
   ───────────────────────────────────────────────────────────────────────── */

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

/* ─────────────────────────────────────────────────────────────────────────
   FILTER OPTIONS
   Scans all products and returns unique spec values grouped by spec name.
   Used by the Products page sidebar to build dynamic filter checkboxes.
   ───────────────────────────────────────────────────────────────────────── */

router.get("/products/filter-options", async (req, res) => {
  try {
    const allProducts = await db.select({ specs: productsTable.specs }).from(productsTable);

    type Spec = { name: string; value: string };

    /* Map from canonical filter key → set of unique values */
    const sockets = new Set<string>();
    const formFactors = new Set<string>();
    const wattages = new Set<string>();
    const memorySpeeds = new Set<string>();
    const storageCapacities = new Set<string>();

    for (const { specs } of allProducts) {
      const specList: Spec[] = Array.isArray(specs) ? (specs as Spec[]) : [];
      for (const s of specList) {
        const name = s.name.toLowerCase().trim();
        const val = s.value.trim();
        if (!val) continue;

        if (name.includes("socket")) sockets.add(val);
        if (name.includes("form") || name.includes("factor")) formFactors.add(val);
        if (name === "wattage") wattages.add(val);
        if (name === "speed" || name.includes("memory speed")) memorySpeeds.add(val);
        if (name === "capacity") storageCapacities.add(val);
      }
    }

    const sort = (s: Set<string>) => [...s].sort((a, b) => a.localeCompare(b));

    res.json({
      sockets: sort(sockets),
      formFactors: sort(formFactors),
      wattages: sort(wattages),
      memorySpeeds: sort(memorySpeeds),
      storageCapacities: sort(storageCapacities),
    });
  } catch (err) {
    req.log.error({ err }, "Error getting filter options");
    res.status(500).json({ error: "internal_error", message: "Failed to get filter options" });
  }
});

// GET /products/velocity — returns salesLast24h count per product id (must be before /:id)
router.get("/products/velocity", async (_req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const rows = await db
      .select({ productId: productSaleEventsTable.productId, total: count() })
      .from(productSaleEventsTable)
      .where(gte(productSaleEventsTable.soldAt, since))
      .groupBy(productSaleEventsTable.productId);
    const map: Record<number, number> = {};
    for (const r of rows) map[r.productId] = Number(r.total);
    return res.json(map);
  } catch {
    return res.status(500).json({ error: "Failed to fetch velocity data" });
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

    similar.sort((a, b) => parseFloat(b.basePrice) - parseFloat(a.basePrice));

    return res.json({ products: similar.slice(0, 4).map(formatProduct) });
  } catch (err) {
    return res.status(500).json({ error: "Failed to get similar products" });
  }
});

router.get("/products/:id/compatible", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] ?? "0");
    if (isNaN(id)) return res.status(400).json({ error: "bad_request" });
    const [source] = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
    if (!source) return res.json({ products: [] });

    const compatCats = COMPATIBLE_CATEGORIES[source.categorySlug] || [];
    if (compatCats.length === 0) return res.json({ products: [] });

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

/* ─────────────────────────────────────────────────────────────────────────
   CATEGORIES — READ
   ───────────────────────────────────────────────────────────────────────── */

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

/* ─────────────────────────────────────────────────────────────────────────
   CATEGORIES — WRITE (owner / manager only)
   ───────────────────────────────────────────────────────────────────────── */

/* POST /categories — create a new category */
router.post("/categories", requireOwnerOrManager, async (req, res) => {
  try {
    const { name, slug, description } = req.body as {
      name?: string; slug?: string; description?: string;
    };

    if (!name || !slug) {
      res.status(400).json({ error: "bad_request", message: "Name and slug are required" });
      return;
    }

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-|-$/g, "");

    const existing = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.slug, cleanSlug))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "conflict", message: "A category with this slug already exists" });
      return;
    }

    const [created] = await db
      .insert(categoriesTable)
      .values({ name, slug: cleanSlug, description: description || "" })
      .returning();

    res.status(201).json(created);
  } catch (err) {
    req.log.error({ err }, "Error creating category");
    res.status(500).json({ error: "internal_error", message: "Failed to create category" });
  }
});

/* PUT /categories/:id — update name / description (owner only) */
router.put("/categories/:id", requireOwner, async (req, res) => {
  try {
    const id = parseInt(req.params["id"] ?? "0");
    if (isNaN(id)) {
      res.status(400).json({ error: "bad_request", message: "Invalid category ID" });
      return;
    }

    const { name, description } = req.body as { name?: string; description?: string };
    if (!name) {
      res.status(400).json({ error: "bad_request", message: "Name is required" });
      return;
    }

    const [updated] = await db
      .update(categoriesTable)
      .set({ name, description: description ?? "" })
      .where(eq(categoriesTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "not_found", message: "Category not found" });
      return;
    }

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error updating category");
    res.status(500).json({ error: "internal_error", message: "Failed to update category" });
  }
});

/* DELETE /categories/:id — delete category (owner only) */
router.delete("/categories/:id", requireOwner, async (req, res) => {
  try {
    const id = parseInt(req.params["id"] ?? "0");
    if (isNaN(id)) {
      res.status(400).json({ error: "bad_request", message: "Invalid category ID" });
      return;
    }

    /* Check if any products are still using this category */
    const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, id)).limit(1);
    if (!cat) {
      res.status(404).json({ error: "not_found", message: "Category not found" });
      return;
    }

    const usedBy = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(productsTable)
      .where(eq(productsTable.categorySlug, cat.slug));

    const count = usedBy[0]?.count ?? 0;
    if (count > 0) {
      res.status(409).json({
        error: "in_use",
        message: `Cannot delete — ${count} product(s) use this category. Reassign them first.`,
      });
      return;
    }

    await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Error deleting category");
    res.status(500).json({ error: "internal_error", message: "Failed to delete category" });
  }
});


export default router;
