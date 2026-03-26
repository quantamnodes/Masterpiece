import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { cartItemsTable, cartSessionsTable, productsTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";

const router: IRouter = Router();

type ProductRow = typeof productsTable.$inferSelect;

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

async function buildCartResponse(sessionId: string) {
  const items = await db
    .select()
    .from(cartItemsTable)
    .where(eq(cartItemsTable.sessionId, sessionId));

  const enrichedItems = await Promise.all(
    items.map(async (item) => {
      const products = await db
        .select()
        .from(productsTable)
        .where(eq(productsTable.id, item.productId))
        .limit(1);

      const product = products[0];
      if (!product) return null;

      const unitPrice = parseFloat(item.unitPrice);
      const totalPrice = unitPrice * item.quantity;

      return {
        id: item.id,
        productId: item.productId,
        variantId: item.variantId ?? null,
        product: formatProduct(product),
        variantName: item.variantName ?? null,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
      };
    }),
  );

  const validItems = enrichedItems.filter((item) => item !== null);
  const subtotal = validItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const itemCount = validItems.reduce((sum, item) => sum + item.quantity, 0);

  return {
    sessionId,
    items: validItems,
    subtotal,
    itemCount,
  };
}

async function ensureSession(sessionId?: string): Promise<string> {
  const sid = sessionId || randomUUID();

  const existing = await db
    .select()
    .from(cartSessionsTable)
    .where(eq(cartSessionsTable.sessionId, sid))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(cartSessionsTable).values({ sessionId: sid });
  }

  return sid;
}

router.get("/cart", async (req, res) => {
  try {
    const sessionId = await ensureSession(req.query["sessionId"] as string | undefined);
    const cart = await buildCartResponse(sessionId);
    res.json(cart);
  } catch (err) {
    req.log.error({ err }, "Error getting cart");
    res.status(500).json({ error: "internal_error", message: "Failed to get cart" });
  }
});

router.post("/cart", async (req, res) => {
  try {
    const { sessionId: rawSessionId, productId, variantId, quantity } = req.body;

    if (!productId || !quantity || quantity < 1) {
      res.status(400).json({ error: "bad_request", message: "productId and quantity are required" });
      return;
    }

    const sessionId = await ensureSession(rawSessionId);

    const products = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .limit(1);

    if (products.length === 0) {
      res.status(404).json({ error: "not_found", message: "Product not found" });
      return;
    }

    const product = products[0]!;
    const baseUnitPrice = product.salePrice
      ? parseFloat(product.salePrice)
      : parseFloat(product.basePrice);

    let variantName: string | null = null;
    let priceModifier = 0;
    if (variantId) {
      const variants = Array.isArray(product.variants)
        ? (product.variants as Array<{ id: number; name: string; priceModifier: number }>)
        : [];
      const variant = variants.find((v) => v.id === variantId);
      if (variant) {
        variantName = variant.name;
        priceModifier = variant.priceModifier || 0;
      }
    }
    const unitPrice = baseUnitPrice + priceModifier;

    const normalizedVariantId = variantId ?? null;

    const existingItemsQuery = db
      .select()
      .from(cartItemsTable)
      .where(
        and(
          eq(cartItemsTable.sessionId, sessionId),
          eq(cartItemsTable.productId, productId),
          normalizedVariantId !== null
            ? eq(cartItemsTable.variantId, normalizedVariantId)
            : isNull(cartItemsTable.variantId),
        ),
      )
      .limit(1);

    const existingItems = await existingItemsQuery;

    if (existingItems.length > 0) {
      const existing = existingItems[0]!;
      await db
        .update(cartItemsTable)
        .set({ quantity: existing.quantity + quantity, updatedAt: new Date() })
        .where(eq(cartItemsTable.id, existing.id));
    } else {
      await db.insert(cartItemsTable).values({
        sessionId,
        productId,
        variantId: normalizedVariantId,
        variantName,
        quantity,
        unitPrice: unitPrice.toFixed(2),
      });
    }

    const cart = await buildCartResponse(sessionId);
    res.json(cart);
  } catch (err) {
    req.log.error({ err }, "Error adding to cart");
    res.status(500).json({ error: "internal_error", message: "Failed to add to cart" });
  }
});

router.patch("/cart/:itemId", async (req, res) => {
  try {
    const itemId = parseInt(req.params["itemId"] ?? "0");
    const { quantity, sessionId } = req.body;

    if (isNaN(itemId) || !quantity || quantity < 0) {
      res.status(400).json({ error: "bad_request", message: "Valid quantity required" });
      return;
    }

    const whereClause = sessionId
      ? and(eq(cartItemsTable.id, itemId), eq(cartItemsTable.sessionId, sessionId))
      : eq(cartItemsTable.id, itemId);

    const items = await db
      .select()
      .from(cartItemsTable)
      .where(whereClause)
      .limit(1);

    if (items.length === 0) {
      res.status(404).json({ error: "not_found", message: "Cart item not found" });
      return;
    }

    const item = items[0]!;

    if (quantity === 0) {
      await db.delete(cartItemsTable).where(eq(cartItemsTable.id, itemId));
    } else {
      await db
        .update(cartItemsTable)
        .set({ quantity, updatedAt: new Date() })
        .where(eq(cartItemsTable.id, itemId));
    }

    const cart = await buildCartResponse(sessionId ?? item.sessionId);
    res.json(cart);
  } catch (err) {
    req.log.error({ err }, "Error updating cart item");
    res.status(500).json({ error: "internal_error", message: "Failed to update cart item" });
  }
});

router.delete("/cart/clear", async (req, res) => {
  try {
    const sessionId = await ensureSession(req.query["sessionId"] as string | undefined);
    await db.delete(cartItemsTable).where(eq(cartItemsTable.sessionId, sessionId));
    const cart = await buildCartResponse(sessionId);
    res.json(cart);
  } catch (err) {
    req.log.error({ err }, "Error clearing cart");
    res.status(500).json({ error: "internal_error", message: "Failed to clear cart" });
  }
});

router.delete("/cart/:itemId", async (req, res) => {
  try {
    const itemId = parseInt(req.params["itemId"] ?? "0");
    const sessionId = req.query["sessionId"] as string | undefined;

    if (isNaN(itemId)) {
      res.status(400).json({ error: "bad_request", message: "Invalid item ID" });
      return;
    }

    const whereClause = sessionId
      ? and(eq(cartItemsTable.id, itemId), eq(cartItemsTable.sessionId, sessionId))
      : eq(cartItemsTable.id, itemId);

    const items = await db
      .select()
      .from(cartItemsTable)
      .where(whereClause)
      .limit(1);

    if (items.length === 0) {
      res.status(404).json({ error: "not_found", message: "Cart item not found" });
      return;
    }

    const item = items[0]!;
    await db.delete(cartItemsTable).where(eq(cartItemsTable.id, itemId));

    const cart = await buildCartResponse(item.sessionId);
    res.json(cart);
  } catch (err) {
    req.log.error({ err }, "Error removing cart item");
    res.status(500).json({ error: "internal_error", message: "Failed to remove cart item" });
  }
});

export default router;
