/**
 * Order Tracking & Rider Location
 *
 * GET  /orders/:id/tracking        — full timeline with history + ETA
 * PUT  /orders/:id/status          — advance status (owner/manager)
 * PUT  /orders/:id/rider-location  — rider updates GPS
 * GET  /orders/:id/rider-location  — buyer polls rider position
 */
import { Router } from "express";
import {
  db,
  ordersTable,
  orderStatusHistoryTable,
  riderLocationsTable,
  usersTable,
} from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  next();
}

/* ── Status metadata ── */
const STATUS_META: Record<string, { label: string; description: string; icon: string; durationMinutes: number }> = {
  confirmed:         { label: "Order Confirmed",       description: "Your order has been received and is being processed.",     icon: "check-circle",    durationMinutes: 0   },
  packing:           { label: "Quality Check & Packing", description: "Our team is carefully checking and packaging your items.", icon: "package",         durationMinutes: 30  },
  dispatched:        { label: "Handed to Logistics",   description: "Your order has been dispatched to our delivery partner.",   icon: "truck",           durationMinutes: 60  },
  out_for_delivery:  { label: "Out for Delivery",      description: "Your rider is on the way! Track them on the map.",         icon: "navigation",      durationMinutes: 90  },
  arriving:          { label: "Arriving Shortly",       description: "Your rider is very close — be ready to receive!",          icon: "map-pin",         durationMinutes: 120 },
  delivered:         { label: "Delivered",              description: "Package delivered. Enjoy your hardware!",                  icon: "check-circle-2",  durationMinutes: -1  },
  cancelled:         { label: "Cancelled",              description: "This order has been cancelled.",                          icon: "x-circle",        durationMinutes: -1  },
};

const ORDER_FLOW = ["confirmed", "packing", "dispatched", "out_for_delivery", "arriving", "delivered"];

function computeEta(order: { createdAt: Date; status: string }) {
  const baseTime = order.createdAt.getTime();
  const currentStepIdx = ORDER_FLOW.indexOf(order.status);
  if (currentStepIdx < 0 || currentStepIdx >= ORDER_FLOW.length - 1) return null;

  const nextStatus = ORDER_FLOW[currentStepIdx + 1]!;
  const currentDuration = STATUS_META[order.status]?.durationMinutes ?? 0;
  const nextDuration = STATUS_META[nextStatus]?.durationMinutes ?? 0;

  const eta = new Date(baseTime + nextDuration * 60 * 1000);
  return eta;
}

/* ── GET /orders/:id/tracking ── */
router.get("/orders/:id/tracking", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id ?? "0");
    if (isNaN(orderId)) return res.status(400).json({ error: "Invalid order ID" });

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
    if (!order) return res.status(404).json({ error: "Order not found" });

    /* Owner + manager can see any order; buyers only their own */
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);
    const isStaff = user?.role === "owner" || user?.role === "admin" || user?.role === "manager";
    if (!isStaff && order.userId !== req.session.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const history = await db
      .select()
      .from(orderStatusHistoryTable)
      .where(eq(orderStatusHistoryTable.orderId, orderId))
      .orderBy(asc(orderStatusHistoryTable.createdAt));

    /* Build full timeline with completion times */
    const completedStatuses = new Set(history.map((h) => h.status));
    const currentIdx = ORDER_FLOW.indexOf(order.status);

    const timeline = ORDER_FLOW.map((status, idx) => {
      const histEntry = history.find((h) => h.status === status);
      const meta = STATUS_META[status]!;
      return {
        status,
        label: meta.label,
        description: meta.description,
        icon: meta.icon,
        completed: completedStatuses.has(status) || (status === "confirmed" && history.length === 0),
        active: status === order.status,
        completedAt: histEntry?.createdAt ?? (status === "confirmed" ? order.createdAt : null),
        note: histEntry?.note ?? "",
      };
    });

    /* Rider location */
    const [riderLoc] = await db
      .select()
      .from(riderLocationsTable)
      .where(eq(riderLocationsTable.orderId, orderId))
      .limit(1);

    const eta = computeEta(order);

    return res.json({
      order: {
        id: order.id,
        status: order.status,
        fulfillmentType: order.fulfillmentType,
        estimatedDelivery: order.estimatedDelivery,
        riderName: order.riderName,
        riderPhone: order.riderPhone,
        deliveryAddress: order.deliveryAddress,
        createdAt: order.createdAt,
        totalAmount: order.totalAmount,
      },
      timeline,
      eta,
      riderLocation: riderLoc
        ? { lat: parseFloat(riderLoc.lat), lng: parseFloat(riderLoc.lng), heading: riderLoc.heading, updatedAt: riderLoc.updatedAt }
        : null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch tracking data" });
  }
});

/* ── PUT /orders/:id/status — advance order status ── */
router.put("/orders/:id/status", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id ?? "0");
    const { status, note, riderName, riderPhone } = req.body as {
      status?: string; note?: string; riderName?: string; riderPhone?: string;
    };

    if (!status || !STATUS_META[status]) {
      return res.status(400).json({ error: "Invalid status. Must be one of: " + Object.keys(STATUS_META).join(", ") });
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);
    const isStaff = user?.role === "owner" || user?.role === "admin" || user?.role === "manager";
    if (!isStaff) return res.status(403).json({ error: "Staff access required" });

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
    if (!order) return res.status(404).json({ error: "Order not found" });

    /* Compute ETA for the new status */
    const eta = computeEta({ ...order, status });

    const updateFields: Record<string, any> = {
      status,
      ...(eta && { estimatedDelivery: eta }),
      ...(riderName && { riderName }),
      ...(riderPhone && { riderPhone }),
    };

    await db.update(ordersTable).set(updateFields).where(eq(ordersTable.id, orderId));

    /* Log status history */
    await db.insert(orderStatusHistoryTable).values({
      orderId,
      status,
      note: note ?? "",
    });

    return res.json({ success: true, status, eta });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update order status" });
  }
});

/* ── PUT /orders/:id/rider-location — rider GPS update ── */
router.put("/orders/:id/rider-location", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id ?? "0");
    const { lat, lng, heading } = req.body as { lat?: number; lng?: number; heading?: number };
    if (lat == null || lng == null) return res.status(400).json({ error: "lat and lng are required" });

    /* Upsert: update if exists, insert if not */
    const existing = await db
      .select()
      .from(riderLocationsTable)
      .where(eq(riderLocationsTable.orderId, orderId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(riderLocationsTable)
        .set({ lat: String(lat), lng: String(lng), heading: heading ?? 0, updatedAt: new Date() })
        .where(eq(riderLocationsTable.orderId, orderId));
    } else {
      await db.insert(riderLocationsTable).values({
        orderId,
        lat: String(lat),
        lng: String(lng),
        heading: heading ?? 0,
      });
    }

    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "Failed to update rider location" });
  }
});

/* ── GET /orders/:id/rider-location — buyer polls ── */
router.get("/orders/:id/rider-location", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id ?? "0");
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (order.userId !== req.session.userId) {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);
      const isStaff = user?.role === "owner" || user?.role === "admin" || user?.role === "manager";
      if (!isStaff) return res.status(403).json({ error: "Access denied" });
    }

    const [loc] = await db
      .select()
      .from(riderLocationsTable)
      .where(eq(riderLocationsTable.orderId, orderId))
      .limit(1);

    return res.json({
      riderLocation: loc
        ? { lat: parseFloat(loc.lat), lng: parseFloat(loc.lng), heading: loc.heading, updatedAt: loc.updatedAt }
        : null,
    });
  } catch {
    return res.status(500).json({ error: "Failed to fetch rider location" });
  }
});

export default router;
