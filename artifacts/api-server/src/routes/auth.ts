import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function computeTier(totalSpent: number): string {
  if (totalSpent >= 10000) return "platinum";
  if (totalSpent >= 2000) return "gold";
  if (totalSpent >= 500) return "silver";
  return "bronze";
}

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

// POST /auth/register
router.post("/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: "username, email and password are required" });
    }
    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db
      .insert(usersTable)
      .values({ username, email, passwordHash, tier: "bronze", totalSpent: "0", purchaseCount: 0 })
      .returning();
    req.session.userId = user.id;
    return res.status(201).json({
      id: user.id,
      username: user.username,
      email: user.email,
      tier: user.tier,
      totalSpent: parseFloat(user.totalSpent),
      purchaseCount: user.purchaseCount,
    });
  } catch (e) {
    return res.status(500).json({ error: "Registration failed" });
  }
});

// POST /auth/login
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    req.session.userId = user.id;
    return res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      tier: user.tier,
      totalSpent: parseFloat(user.totalSpent),
      purchaseCount: user.purchaseCount,
    });
  } catch {
    return res.status(500).json({ error: "Login failed" });
  }
});

// POST /auth/logout
router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// GET /auth/me
router.get("/auth/me", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.session.userId))
      .limit(1);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    const tier = computeTier(parseFloat(user.totalSpent));
    return res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      tier,
      totalSpent: parseFloat(user.totalSpent),
      purchaseCount: user.purchaseCount,
    });
  } catch {
    return res.status(500).json({ error: "Failed to fetch user" });
  }
});

export default router;
