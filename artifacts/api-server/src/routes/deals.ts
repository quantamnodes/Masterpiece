import { Router } from "express";
import { db, productsTable } from "@workspace/db";
import { isNotNull, sql } from "drizzle-orm";
import { analyzeImageWithFallback } from "../services/vision/visionService";

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

// POST /search/image — vision-based image search using GPT-4o-mini
router.post("/search/image", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg" } = req.body as {
      imageBase64?: string;
      mimeType?: string;
    };
    if (!imageBase64) return res.status(400).json({ error: "No image provided" });

    const VISION_PROMPT =
      'Identify the PC hardware component in this image. Reply with JSON only (no markdown fences): {"productName":"best guess model name","keywords":["keyword1","keyword2","keyword3"],"category":"gpus|cpus|motherboards|memory|storage|psus|cooling|cases|peripherals|other"}. If this is not a PC component, reply: {"productName":"","keywords":[],"category":"other"}.';

    const raw = (
      await analyzeImageWithFallback(imageBase64, VISION_PROMPT, mimeType)
    ).trim();
    let identified: { productName: string; keywords: string[]; category: string } = {
      productName: "",
      keywords: [],
      category: "other",
    };
    try {
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      identified = JSON.parse(cleaned);
    } catch {
      /* unparseable — return empty results */
    }

    if (!identified.productName && identified.keywords.length === 0) {
      return res.json({ results: [], identified: null });
    }

    const allProducts = await db.select().from(productsTable);
    const terms = [identified.productName, ...identified.keywords]
      .filter(Boolean)
      .map((t) => t.toLowerCase());

    const scored = allProducts
      .map((p) => {
        const text = `${p.name} ${p.category} ${p.description ?? ""}`.toLowerCase();
        let score = 0;
        for (const term of terms) {
          if (text.includes(term)) score += term === identified.productName.toLowerCase() ? 3 : 1;
        }
        return { ...p, score };
      })
      .filter((p) => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        basePrice: parseFloat(p.basePrice),
        salePrice: p.salePrice ? parseFloat(p.salePrice) : null,
        imageUrl: p.imageUrl,
        slug: p.slug,
      }));

    return res.json({ results: scored, identified });
  } catch (err) {
    console.error("Image search error:", err);
    return res.status(500).json({ error: "Image search failed" });
  }
});

export default router;
