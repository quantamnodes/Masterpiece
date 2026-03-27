import { Router } from "express";
import { db, ordersTable, usersTable, cartItemsTable, cartSessionsTable, productSaleEventsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  next();
}

// GET /orders/my — current user's order history
router.get("/orders/my", requireAuth, async (req, res) => {
  try {
    const orders = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.userId, req.session.userId!))
      .orderBy(desc(ordersTable.createdAt))
      .limit(50);

    return res.json({ orders });
  } catch {
    return res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// POST /orders — place a new order (BOPIS or delivery)
router.post("/orders", requireAuth, async (req, res) => {
  try {
    const {
      totalAmount,
      itemCount,
      fulfillmentType = "delivery",
      branchId = null,
      deliveryFee = 0,
      cartItems = [],
    } = req.body;

    if (!totalAmount || !itemCount) return res.status(400).json({ error: "Missing order details" });

    const [order] = await db
      .insert(ordersTable)
      .values({
        userId: req.session.userId!,
        totalAmount: String(totalAmount),
        itemCount: parseInt(itemCount),
        status: "completed",
        fulfillmentType,
        branchId: branchId ? parseInt(branchId) : null,
        deliveryFee: String(deliveryFee),
      })
      .returning();

    // Award loyalty points (1 point per $1)
    const pointsEarned = Math.floor(parseFloat(totalAmount));
    if (pointsEarned > 0) {
      await db
        .update(usersTable)
        .set({
          loyaltyPoints: (await db
            .select({ pts: usersTable.loyaltyPoints })
            .from(usersTable)
            .where(eq(usersTable.id, req.session.userId!))
            .limit(1))[0]?.pts + pointsEarned || pointsEarned,
          purchaseCount: (await db
            .select({ cnt: usersTable.purchaseCount })
            .from(usersTable)
            .where(eq(usersTable.id, req.session.userId!))
            .limit(1))[0]?.cnt + 1 || 1,
          totalSpent: String(
            parseFloat(
              (await db
                .select({ spent: usersTable.totalSpent })
                .from(usersTable)
                .where(eq(usersTable.id, req.session.userId!))
                .limit(1))[0]?.spent || "0",
            ) + parseFloat(totalAmount),
          ),
        })
        .where(eq(usersTable.id, req.session.userId!));
    }

    // Record product sale events for velocity heatmap
    if (Array.isArray(cartItems) && cartItems.length > 0) {
      try {
        await db.insert(productSaleEventsTable).values(
          cartItems
            .filter((ci: any) => ci.productId && ci.quantity)
            .map((ci: any) => ({ productId: Number(ci.productId), quantity: Number(ci.quantity) }))
        );
      } catch { /* non-fatal */ }
    }

    return res.status(201).json({ order, pointsEarned });
  } catch {
    return res.status(500).json({ error: "Failed to place order" });
  }
});

export default router;
