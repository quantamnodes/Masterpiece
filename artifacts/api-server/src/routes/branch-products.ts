import { Router } from "express";
import { db, branchProductsTable, usersTable, productsTable, branchesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

async function getAuthUser(req: any) {
  if (!req.session.userId) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId)).limit(1);
  return user || null;
}

// GET /branches/:branchId/products — get all products with branch-specific data
router.get("/branches/:branchId/products", async (req, res) => {
  try {
    const branchId = parseInt(req.params.branchId);
    const products = await db.select().from(productsTable).orderBy(productsTable.name);
    const branchData = await db.select().from(branchProductsTable).where(eq(branchProductsTable.branchId, branchId));
    const branchMap = new Map(branchData.map((bp) => [bp.productId, bp]));
    const result = products.map((p) => ({
      ...p,
      branchData: branchMap.get(p.id) || null,
    }));
    res.json(result);
  } catch {
    res.status(500).json({ error: "Failed to fetch branch products" });
  }
});

// GET /products/:productId/branches — get branch availability for a product (public)
router.get("/products/:productId/branches", async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    const branches = await db.select().from(branchesTable).where(eq(branchesTable.active, true));
    const branchData = await db.select().from(branchProductsTable).where(eq(branchProductsTable.productId, productId));
    const branchMap = new Map(branchData.map((bp) => [bp.branchId, bp]));
    const result = branches.map((b) => ({
      ...b,
      productData: branchMap.get(b.id) || { available: true, stock: null, discount: null, featured: false, notes: "" },
    }));
    res.json(result);
  } catch {
    res.status(500).json({ error: "Failed to fetch product branch data" });
  }
});

// PUT /branches/:branchId/products/:productId — update branch-specific product data (owner or manager of that branch)
router.put("/branches/:branchId/products/:productId", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    const branchId = parseInt(req.params.branchId);
    const productId = parseInt(req.params.productId);
    if (user.role !== "owner" && !(user.role === "manager" && user.branchId === branchId)) {
      return res.status(403).json({ error: "Access denied" });
    }
    const { available, stock, discount, featured, notes } = req.body;
    const existing = await db.select().from(branchProductsTable)
      .where(and(eq(branchProductsTable.branchId, branchId), eq(branchProductsTable.productId, productId)))
      .limit(1);
    const data = {
      branchId,
      productId,
      available: available ?? true,
      stock: stock ?? null,
      discount: discount !== undefined ? String(discount) : null,
      featured: featured ?? false,
      notes: notes ?? "",
      updatedAt: new Date(),
    };
    let result;
    if (existing.length > 0) {
      [result] = await db.update(branchProductsTable)
        .set(data)
        .where(and(eq(branchProductsTable.branchId, branchId), eq(branchProductsTable.productId, productId)))
        .returning();
    } else {
      [result] = await db.insert(branchProductsTable).values(data).returning();
    }
    res.json(result);
  } catch {
    res.status(500).json({ error: "Failed to update branch product" });
  }
});

export default router;
