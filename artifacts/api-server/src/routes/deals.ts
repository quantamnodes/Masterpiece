import { Router } from "express";
import { db, productsTable } from "@workspace/db";
import { isNotNull, sql } from "drizzle-orm";

const router = Router();

// GET /deals — all products with a salePrice (discounted)
router.get("/deals", async (req, res) => {
  try {
    const products = await db
      .select()
      .from(productsTable)
      .where(isNotNull(productsTable.salePrice))
      .orderBy(sql`(base_price::numeric - sale_price::numeric) DESC`);

    const enriched = products.map((p) => ({
      ...p,
      basePrice: parseFloat(p.basePrice),
      salePrice: p.salePrice ? parseFloat(p.salePrice) : null,
      discount: p.salePrice
        ? Math.round(((parseFloat(p.basePrice) - parseFloat(p.salePrice)) / parseFloat(p.basePrice)) * 100)
        : 0,
    }));

    return res.json({ deals: enriched, total: enriched.length });
  } catch {
    return res.status(500).json({ error: "Failed to fetch deals" });
  }
});

// GET /search/suggest?q=... — autocomplete search suggestions
router.get("/search/suggest", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim().toLowerCase();
    if (q.length < 2) return res.json({ suggestions: [], similar: [] });

    const allProducts = await db.select().from(productsTable);

    const suggestions = allProducts
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.shortDescription.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      )
      .slice(0, 8)
      .map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        basePrice: parseFloat(p.basePrice),
        salePrice: p.salePrice ? parseFloat(p.salePrice) : null,
        imageUrl: p.imageUrl,
        slug: p.slug,
      }));

    // If no direct matches, return similar products from same category or tag matches
    let similar: typeof suggestions = [];
    if (suggestions.length === 0) {
      similar = allProducts
        .slice(0, 4)
        .map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          basePrice: parseFloat(p.basePrice),
          salePrice: p.salePrice ? parseFloat(p.salePrice) : null,
          imageUrl: p.imageUrl,
          slug: p.slug,
        }));
    }

    return res.json({ suggestions, similar });
  } catch {
    return res.status(500).json({ error: "Search failed" });
  }
});

export default router;
