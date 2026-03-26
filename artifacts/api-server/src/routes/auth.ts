import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const EMPLOYEE_CODE = process.env.EMPLOYEE_CODE || "AXIOM-EMPLOYEE-2024";

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

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    tier: user.tier,
    totalSpent: parseFloat(user.totalSpent),
    purchaseCount: user.purchaseCount,
  };
}

// POST /auth/register
router.post("/auth/register", async (req, res) => {
  try {
    const { username, email, password, employeeCode } = req.body;
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
    const role = (typeof employeeCode === "string" && employeeCode.trim() === EMPLOYEE_CODE) ? "admin" : "user";
    const [user] = await db
      .insert(usersTable)
      .values({ username, email, passwordHash, role, tier: "bronze", totalSpent: "0", purchaseCount: 0 })
      .returning();
    req.session.userId = user.id;
    return res.status(201).json(formatUser(user));
  } catch (e) {
    return res.status(500).json({ error: "Registration failed" });
  }
});

// POST /auth/login
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password, employeeCode } = req.body;
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
    // If the correct employee code is provided at login, upgrade role to admin
    if (typeof employeeCode === "string" && employeeCode.trim() === EMPLOYEE_CODE && user.role !== "admin") {
      await db.update(usersTable).set({ role: "admin" }).where(eq(usersTable.id, user.id));
      user.role = "admin";
    }
    req.session.userId = user.id;
    return res.json(formatUser(user));
  } catch {
    return res.status(500).json({ error: "Login failed" });
  }
});

// POST /auth/claim-admin — allows a logged-in user to upgrade their role
router.post("/auth/claim-admin", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  try {
    const { employeeCode } = req.body;
    if (!employeeCode || typeof employeeCode !== "string" || employeeCode.trim() !== EMPLOYEE_CODE) {
      return res.status(403).json({ error: "Invalid employee code" });
    }
    const [updated] = await db
      .update(usersTable)
      .set({ role: "admin" })
      .where(eq(usersTable.id, req.session.userId))
      .returning();
    return res.json(formatUser(updated));
  } catch {
    return res.status(500).json({ error: "Failed to claim admin access" });
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
    return res.json({ ...formatUser(user), tier });
  } catch {
    return res.status(500).json({ error: "Failed to fetch user" });
  }
});

export default router;
