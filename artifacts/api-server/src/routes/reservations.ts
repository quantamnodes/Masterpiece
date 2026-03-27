/**
 * Reservations — "Hold for Me"
 * POST   /reservations           — create a 2-hour hold on a product at a branch
 * GET    /reservations/my        — current user's active reservations
 * DELETE /reservations/:id       — cancel a reservation
 * PUT    /reservations/:id/confirm — mark confirmed (staff use)
 */
import { Router } from "express";
import { db, reservationsTable, productsTable, branchesTable, usersTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  next();
}

function randomOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/** Expire stale reservations so they don't block inventory */
async function expireOldReservations() {
  const now = new Date();
  await db
    .update(reservationsTable)
    .set({ status: "expired" })
    .where(
      and(
        eq(reservationsTable.status, "active"),
        // drizzle doesn't have lt for timestamp directly, filter in JS
      ),
    );
  // Simpler: fetch active ones and update expired
  const active = await db
    .select()
    .from(reservationsTable)
    .where(eq(reservationsTable.status, "active"));

  for (const r of active) {
    if (r.expiresAt < now) {
      await db
        .update(reservationsTable)
        .set({ status: "expired" })
        .where(eq(reservationsTable.id, r.id));
    }
  }
}

/* POST /reservations */
router.post("/reservations", requireAuth, async (req, res) => {
  try {
    await expireOldReservations();

    const { productId, branchId } = req.body as { productId?: number; branchId?: number };
    if (!productId || !branchId) {
      return res.status(400).json({ error: "productId and branchId are required" });
    }

    const [product] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .limit(1);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const [branch] = await db
      .select()
      .from(branchesTable)
      .where(eq(branchesTable.id, branchId))
      .limit(1);
    if (!branch) return res.status(404).json({ error: "Branch not found" });

    /* Check for existing active reservation by this user for this product+branch */
    const existing = await db
      .select()
      .from(reservationsTable)
      .where(
        and(
          eq(reservationsTable.userId, req.session.userId!),
          eq(reservationsTable.productId, productId),
          eq(reservationsTable.branchId, branchId),
          eq(reservationsTable.status, "active"),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ error: "You already have an active hold on this item at this branch" });
    }

    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    const otpCode = randomOtp();

    const [reservation] = await db
      .insert(reservationsTable)
      .values({
        userId: req.session.userId!,
        productId,
        branchId,
        otpCode,
        status: "active",
        expiresAt,
      })
      .returning();

    return res.status(201).json({
      reservation: {
        ...reservation,
        productName: product.name,
        productImageUrl: product.imageUrl,
        branchName: branch.name,
        branchLocation: branch.location,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create reservation" });
  }
});

/* GET /reservations/my */
router.get("/reservations/my", requireAuth, async (req, res) => {
  try {
    await expireOldReservations();

    const myReservations = await db
      .select()
      .from(reservationsTable)
      .where(eq(reservationsTable.userId, req.session.userId!));

    /* Enrich with product + branch data */
    const enriched = await Promise.all(
      myReservations.map(async (r) => {
        const [product] = await db
          .select()
          .from(productsTable)
          .where(eq(productsTable.id, r.productId))
          .limit(1);
        const [branch] = await db
          .select()
          .from(branchesTable)
          .where(eq(branchesTable.id, r.branchId))
          .limit(1);
        return {
          ...r,
          productName: product?.name ?? "Unknown",
          productImageUrl: product?.imageUrl ?? "",
          productSlug: product?.slug ?? "",
          branchName: branch?.name ?? "Unknown",
          branchLocation: branch?.location ?? "",
        };
      }),
    );

    return res.json({ reservations: enriched });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch reservations" });
  }
});

/* DELETE /reservations/:id — cancel */
router.delete("/reservations/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id ?? "0");
    const [r] = await db
      .select()
      .from(reservationsTable)
      .where(eq(reservationsTable.id, id))
      .limit(1);

    if (!r) return res.status(404).json({ error: "Reservation not found" });
    if (r.userId !== req.session.userId) return res.status(403).json({ error: "Not your reservation" });

    await db
      .update(reservationsTable)
      .set({ status: "cancelled" })
      .where(eq(reservationsTable.id, id));

    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "Failed to cancel reservation" });
  }
});

/* PUT /reservations/:id/confirm — staff confirms pickup */
router.put("/reservations/:id/confirm", async (req, res) => {
  try {
    const id = parseInt(req.params.id ?? "0");
    const { otpCode } = req.body as { otpCode?: string };

    const [r] = await db
      .select()
      .from(reservationsTable)
      .where(eq(reservationsTable.id, id))
      .limit(1);

    if (!r) return res.status(404).json({ error: "Reservation not found" });
    if (r.status !== "active") return res.status(409).json({ error: `Reservation is ${r.status}` });
    if (r.expiresAt < new Date()) {
      await db.update(reservationsTable).set({ status: "expired" }).where(eq(reservationsTable.id, id));
      return res.status(409).json({ error: "Reservation has expired" });
    }
    if (r.otpCode !== otpCode) return res.status(400).json({ error: "Invalid OTP code" });

    const [updated] = await db
      .update(reservationsTable)
      .set({ status: "confirmed" })
      .where(eq(reservationsTable.id, id))
      .returning();

    return res.json({ reservation: updated });
  } catch {
    return res.status(500).json({ error: "Failed to confirm reservation" });
  }
});

export default router;
