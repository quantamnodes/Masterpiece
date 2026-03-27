import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, accessCodesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

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
    branchId: user.branchId,
    tier: user.tier,
    totalSpent: parseFloat(user.totalSpent),
    purchaseCount: user.purchaseCount,
    loyaltyPoints: user.loyaltyPoints ?? 0,
  };
}

async function resolveAccessCode(code: string): Promise<{ role: string; branchId: number | null } | null> {
  if (!code || !code.trim()) return null;
  const trimmed = code.trim();

  // DB lookup first — active codes in the database take precedence
  const [acRow] = await db
    .select()
    .from(accessCodesTable)
    .where(and(eq(accessCodesTable.code, trimmed), eq(accessCodesTable.active, true)))
    .limit(1);
  if (acRow) {
    if (acRow.expiresAt && new Date(acRow.expiresAt) < new Date()) return null;
    const role = acRow.type === "owner" ? "owner" : acRow.type === "manager" ? "manager" : "user";
    return { role, branchId: acRow.branchId ?? null };
  }

  // Environment variable bootstrap fallback — only used when DB returns nothing
  // (e.g. after a DB wipe before re-seeding). Rotate OWNER_BOOTSTRAP_CODE in production.
  const bootstrapCode = process.env.OWNER_BOOTSTRAP_CODE ?? "AXIOM-OWNER-22015";
  if (trimmed === bootstrapCode) {
    return { role: "owner", branchId: null };
  }

  return null;
}

// POST /auth/register
router.post("/auth/register", async (req, res) => {
  try {
    const { username, email, password, employeeCode } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: "username, email and password are required" });
    }
    const [byEmail] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (byEmail) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const [byUsername] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.username, username)).limit(1);
    if (byUsername) {
      return res.status(409).json({ error: "Operator name already taken" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    let role = "user";
    let branchId: number | null = null;
    if (employeeCode && typeof employeeCode === "string") {
      const resolved = await resolveAccessCode(employeeCode);
      if (resolved) {
        role = resolved.role;
        branchId = resolved.branchId;
      }
    }
    const [user] = await db
      .insert(usersTable)
      .values({ username, email, passwordHash, role, branchId, tier: "bronze", totalSpent: "0", purchaseCount: 0 })
      .returning();
    if (employeeCode && role !== "user") {
      await db.update(accessCodesTable)
        .set({ usedBy: user.id })
        .where(eq(accessCodesTable.code, employeeCode.trim()));
    }
    req.session.userId = user.id;
    return res.status(201).json(formatUser(user));
  } catch (err) {
    console.error("[register]", err);
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
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });
    if (employeeCode && typeof employeeCode === "string" && user.role === "user") {
      const resolved = await resolveAccessCode(employeeCode);
      if (resolved) {
        await db.update(usersTable)
          .set({ role: resolved.role, branchId: resolved.branchId })
          .where(eq(usersTable.id, user.id));
        user.role = resolved.role;
        user.branchId = resolved.branchId;
      }
    }
    req.session.userId = user.id;
    return res.json(formatUser(user));
  } catch {
    return res.status(500).json({ error: "Login failed" });
  }
});

// POST /auth/claim-role — allows a logged-in user to claim a role via access code
router.post("/auth/claim-role", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  try {
    const { accessCode } = req.body;
    if (!accessCode) return res.status(400).json({ error: "accessCode is required" });
    const resolved = await resolveAccessCode(accessCode);
    if (!resolved) return res.status(403).json({ error: "Invalid or expired access code" });
    const [updated] = await db
      .update(usersTable)
      .set({ role: resolved.role, branchId: resolved.branchId })
      .where(eq(usersTable.id, req.session.userId))
      .returning();
    await db.update(accessCodesTable)
      .set({ usedBy: req.session.userId })
      .where(eq(accessCodesTable.code, accessCode.trim()));
    return res.json(formatUser(updated));
  } catch {
    return res.status(500).json({ error: "Failed to claim role" });
  }
});

// POST /auth/logout
router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// GET /auth/me
router.get("/auth/me", async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId)).limit(1);
    if (!user) return res.status(401).json({ error: "User not found" });
    const tier = computeTier(parseFloat(user.totalSpent));
    return res.json({ ...formatUser(user), tier });
  } catch {
    return res.status(500).json({ error: "Failed to fetch user" });
  }
});

export default router;
