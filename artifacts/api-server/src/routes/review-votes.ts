/**
 * Review Votes — helpfulness voting
 * POST /reviews/:id/vote  — vote helpful/unhelpful (idempotent toggle)
 * GET  /reviews/:id/vote  — current user's vote on a review
 *
 * Also exposes:
 * POST /reviews           — submit a new review (with optional photoUrl)
 * GET  /products/:id/reviews — list reviews for a product
 * GET  /products/:id/review-summary — AI-generated summary (cached per product)
 */
import { Router } from "express";
import { db, reviewsTable, reviewVotesTable, productsTable, usersTable, discountCodesTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  next();
}

/* ── In-memory AI summary cache (per productId) ── */
const aiSummaryCache = new Map<number, { summary: string; generatedAt: number }>();
const AI_CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

/* ── GET /products/:id/reviews ── */
router.get("/products/:id/reviews", async (req, res) => {
  try {
    const productId = parseInt(req.params.id ?? "0");
    if (isNaN(productId)) return res.status(400).json({ error: "Invalid product ID" });

    const reviews = await db
      .select()
      .from(reviewsTable)
      .where(eq(reviewsTable.productId, productId))
      .orderBy(desc(reviewsTable.helpfulCount), desc(reviewsTable.createdAt));

    return res.json({ reviews });
  } catch {
    return res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

/* ── POST /reviews — submit a new review ── */
router.post("/reviews", requireAuth, async (req, res) => {
  try {
    const { productId, rating, title, body, photoUrl } = req.body as {
      productId?: number; rating?: number; title?: string; body?: string; photoUrl?: string;
    };

    if (!productId || !body) return res.status(400).json({ error: "productId and body are required" });

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const [review] = await db.insert(reviewsTable).values({
      userId: req.session.userId!,
      productId,
      rating: Math.min(5, Math.max(1, rating ?? 5)),
      title: title ?? "",
      body,
      reviewer: user?.username ?? "Anonymous",
      verified: false,
      photoUrl: photoUrl ?? null,
    }).returning();

    /* Invalidate AI summary cache for this product */
    aiSummaryCache.delete(productId);

    /* Generate discount code if the review includes a photo */
    let discountCode: string | null = null;
    if (photoUrl) {
      const code = `REVIEW-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      await db.insert(discountCodesTable).values({
        code,
        discountPct: 5,
        userId: req.session.userId!,
        reviewId: review.id,
        expiresAt,
      });
      discountCode = code;
    }

    return res.status(201).json({ review, discountCode });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to submit review" });
  }
});

/* ── POST /reviews/:id/vote — toggle helpful/unhelpful ── */
router.post("/reviews/:id/vote", requireAuth, async (req, res) => {
  try {
    const reviewId = parseInt(req.params.id ?? "0");
    const { helpful } = req.body as { helpful?: boolean };
    if (typeof helpful !== "boolean") return res.status(400).json({ error: "helpful must be boolean" });

    const [review] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, reviewId)).limit(1);
    if (!review) return res.status(404).json({ error: "Review not found" });

    const existing = await db
      .select()
      .from(reviewVotesTable)
      .where(and(eq(reviewVotesTable.userId, req.session.userId!), eq(reviewVotesTable.reviewId, reviewId)))
      .limit(1);

    if (existing.length > 0) {
      const prev = existing[0]!;
      if (prev.helpful === helpful) {
        /* Same vote → remove it (toggle off) */
        await db.delete(reviewVotesTable).where(eq(reviewVotesTable.id, prev.id));
        /* Decrement counter */
        if (helpful) {
          await db.update(reviewsTable).set({ helpfulCount: sql`${reviewsTable.helpfulCount} - 1` }).where(eq(reviewsTable.id, reviewId));
        } else {
          await db.update(reviewsTable).set({ unhelpfulCount: sql`${reviewsTable.unhelpfulCount} - 1` }).where(eq(reviewsTable.id, reviewId));
        }
        const [updated] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, reviewId)).limit(1);
        return res.json({ vote: null, review: updated });
      } else {
        /* Changed vote — update existing row + adjust counts */
        await db.update(reviewVotesTable).set({ helpful }).where(eq(reviewVotesTable.id, prev.id));
        if (helpful) {
          /* Was unhelpful → now helpful */
          await db.update(reviewsTable).set({
            helpfulCount: sql`${reviewsTable.helpfulCount} + 1`,
            unhelpfulCount: sql`${reviewsTable.unhelpfulCount} - 1`,
          }).where(eq(reviewsTable.id, reviewId));
        } else {
          /* Was helpful → now unhelpful */
          await db.update(reviewsTable).set({
            helpfulCount: sql`${reviewsTable.helpfulCount} - 1`,
            unhelpfulCount: sql`${reviewsTable.unhelpfulCount} + 1`,
          }).where(eq(reviewsTable.id, reviewId));
        }
      }
    } else {
      /* New vote */
      await db.insert(reviewVotesTable).values({ userId: req.session.userId!, reviewId, helpful });
      if (helpful) {
        await db.update(reviewsTable).set({ helpfulCount: sql`${reviewsTable.helpfulCount} + 1` }).where(eq(reviewsTable.id, reviewId));
      } else {
        await db.update(reviewsTable).set({ unhelpfulCount: sql`${reviewsTable.unhelpfulCount} + 1` }).where(eq(reviewsTable.id, reviewId));
      }
    }

    const [updatedReview] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, reviewId)).limit(1);
    const [myVote] = await db.select().from(reviewVotesTable).where(
      and(eq(reviewVotesTable.userId, req.session.userId!), eq(reviewVotesTable.reviewId, reviewId))
    ).limit(1);

    return res.json({ vote: myVote ?? null, review: updatedReview });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to record vote" });
  }
});

/* ── GET /reviews/:id/my-vote — returns current user's vote ── */
router.get("/reviews/:id/my-vote", requireAuth, async (req, res) => {
  try {
    const reviewId = parseInt(req.params.id ?? "0");
    const [vote] = await db
      .select()
      .from(reviewVotesTable)
      .where(and(eq(reviewVotesTable.userId, req.session.userId!), eq(reviewVotesTable.reviewId, reviewId)))
      .limit(1);
    return res.json({ vote: vote ?? null });
  } catch {
    return res.status(500).json({ error: "Failed to fetch vote" });
  }
});

/* ── GET /products/:id/review-summary — AI-generated summary ── */
router.get("/products/:id/review-summary", async (req, res) => {
  try {
    const productId = parseInt(req.params.id ?? "0");
    if (isNaN(productId)) return res.status(400).json({ error: "Invalid product ID" });

    /* Check cache */
    const cached = aiSummaryCache.get(productId);
    if (cached && Date.now() - cached.generatedAt < AI_CACHE_TTL_MS) {
      return res.json({ summary: cached.summary, cached: true });
    }

    const reviews = await db.select().from(reviewsTable).where(eq(reviewsTable.productId, productId));
    if (reviews.length === 0) {
      return res.json({ summary: null, cached: false });
    }

    /* Build review corpus */
    const corpus = reviews
      .slice(0, 30)
      .map((r) => `[${r.rating}★] ${r.title ? r.title + ": " : ""}${r.body}`)
      .join("\n");

    try {
      /* Use OpenAI via Replit AI Integrations proxy */
      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: "https://ai.replit.com/v1",
      });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a concise review summarizer. Generate a 2-sentence summary of customer reviews that highlights the most common praise and most common criticism. Start with 'Customers say...' and be direct.",
          },
          {
            role: "user",
            content: `Summarize these ${reviews.length} product reviews:\n\n${corpus}`,
          },
        ],
        max_tokens: 150,
        temperature: 0.4,
      });

      const summary = completion.choices[0]?.message?.content?.trim() ?? null;
      if (summary) {
        aiSummaryCache.set(productId, { summary, generatedAt: Date.now() });
      }
      return res.json({ summary, cached: false });
    } catch (aiErr) {
      console.warn("AI summary failed, returning null:", aiErr);
      return res.json({ summary: null, cached: false });
    }
  } catch (err) {
    return res.status(500).json({ error: "Failed to get review summary" });
  }
});

export default router;
