import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { useUserStore, TIER_CONFIG, type Tier } from "@/store/user-store";
import { User, Mail, Lock, LogOut, Star, Zap, ShieldCheck, Crown, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

const API_BASE = (() => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${base}/api`;
})();

async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include", ...opts });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function TierBadge({ tier }: { tier: Tier }) {
  const cfg = TIER_CONFIG[tier];
  const Icon = tier === "platinum" ? Crown : tier === "gold" ? Star : tier === "silver" ? Zap : ShieldCheck;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-sm border font-mono text-xs uppercase tracking-widest font-bold ${cfg.bg} ${cfg.color}`}>
      <Icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
}

function TierProgress({ tier, totalSpent }: { tier: Tier; totalSpent: number }) {
  const cfg = TIER_CONFIG[tier];
  if (!cfg.next) {
    return (
      <div className="mt-4">
        <p className="font-mono text-xs text-primary mb-2">MAX TIER — PLATINUM OPERATOR</p>
        <div className="h-1.5 bg-primary rounded-full" />
      </div>
    );
  }
  const tiers = [0, 500, 2000, 10000];
  const tierIndex = ["bronze", "silver", "gold", "platinum"].indexOf(tier);
  const start = tiers[tierIndex];
  const progress = Math.min(((totalSpent - start) / (cfg.next - start)) * 100, 100);
  return (
    <div className="mt-4">
      <div className="flex justify-between font-mono text-xs text-muted-foreground mb-2">
        <span>${totalSpent.toLocaleString()} spent</span>
        <span>${cfg.next.toLocaleString()} for next tier</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

function ProfileView() {
  const { user, logout, setUser } = useUserStore();
  const [claimCode, setClaimCode] = useState("");
  const [claimError, setClaimError] = useState("");
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);

  const handleClaimAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaimError("");
    setClaimLoading(true);
    try {
      const updated = await apiFetch("/auth/claim-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeCode: claimCode.trim() }),
      });
      setUser(updated);
      setClaimSuccess(true);
      setClaimCode("");
    } catch (err: unknown) {
      setClaimError(err instanceof Error ? err.message : "Invalid code.");
    } finally {
      setClaimLoading(false);
    }
  };

  if (!user) return null;
  const cfg = TIER_CONFIG[user.tier as Tier];

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Profile card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-border bg-card rounded-sm p-8 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary/10 border border-primary/30 rounded-sm flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-heading font-bold uppercase">{user.username}</h2>
              <p className="text-muted-foreground font-mono text-sm">{user.email}</p>
            </div>
          </div>
          <TierBadge tier={user.tier as Tier} />
        </div>

        <div className="grid grid-cols-3 gap-4 py-6 border-y border-border mb-6">
          <div className="text-center">
            <div className="text-2xl font-mono font-bold text-foreground">{user.purchaseCount}</div>
            <div className="text-xs font-mono uppercase text-muted-foreground">Purchases</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-mono font-bold text-foreground">${user.totalSpent.toLocaleString()}</div>
            <div className="text-xs font-mono uppercase text-muted-foreground">Total Spent</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-mono font-bold ${cfg.color}`}>{cfg.discount}%</div>
            <div className="text-xs font-mono uppercase text-muted-foreground">Tier Discount</div>
          </div>
        </div>

        <TierProgress tier={user.tier as Tier} totalSpent={user.totalSpent} />
      </motion.div>

      {/* Tier benefits */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="border border-border bg-card rounded-sm p-8"
      >
        <h3 className="text-xl font-heading font-bold uppercase mb-6">Operator Tier Benefits</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(["bronze", "silver", "gold", "platinum"] as Tier[]).map((t) => {
            const c = TIER_CONFIG[t];
            const active = t === user.tier;
            return (
              <div key={t} className={`p-4 border rounded-sm ${active ? `${c.bg} border-opacity-100` : "border-border opacity-50"}`}>
                <div className={`font-heading font-bold uppercase text-sm mb-2 ${c.color}`}>{c.label}</div>
                <div className="font-mono text-xs text-muted-foreground mb-1">{c.discount}% discount</div>
                <div className="font-mono text-xs text-muted-foreground">
                  {c.next ? `$${c.next.toLocaleString()} threshold` : "Platinum exclusive"}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Platinum access */}
      {user.tier === "platinum" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="border border-primary/50 bg-primary/5 rounded-sm p-6 flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <Crown className="w-8 h-8 text-primary" />
            <div>
              <h4 className="font-heading font-bold uppercase text-primary">Platinum Vault Unlocked</h4>
              <p className="font-mono text-xs text-muted-foreground">Access secret deals available only to platinum operators.</p>
            </div>
          </div>
          <Link to="/platinum">
            <motion.button
              whileHover={{ x: 4 }}
              className="flex items-center gap-2 font-mono text-sm text-primary uppercase"
            >
              Enter <ChevronRight className="w-4 h-4" />
            </motion.button>
          </Link>
        </motion.div>
      )}

      {/* Claim Admin Access (shown only if not already admin) */}
      {user.role !== "admin" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="border border-border bg-card rounded-sm p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h3 className="font-heading font-bold uppercase text-sm">Claim Admin Access</h3>
          </div>
          <p className="font-mono text-xs text-muted-foreground mb-4">
            AxiomCraft staff can enter their employee code below to unlock the admin Dashboard without creating a new account.
          </p>
          {claimSuccess ? (
            <div className="flex items-center gap-2 px-4 py-3 border border-primary/40 bg-primary/10 rounded-sm">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span className="font-mono text-sm text-primary">Admin access granted — Dashboard link now visible in the navbar.</span>
            </div>
          ) : (
            <form onSubmit={handleClaimAdmin} className="flex gap-3">
              <div className="relative flex-1">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={claimCode}
                  onChange={(e) => setClaimCode(e.target.value)}
                  placeholder="AXIOM-EMPLOYEE-2024"
                  autoComplete="off"
                  className="w-full bg-background border border-border rounded-sm pl-10 pr-4 py-2.5 font-mono text-sm focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={claimLoading || !claimCode.trim()}
                className="px-5 py-2.5 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-widest rounded-sm hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0"
              >
                {claimLoading ? "..." : "Claim"}
              </button>
            </form>
          )}
          {claimError && (
            <p className="font-mono text-xs text-destructive mt-2">{claimError}</p>
          )}
        </motion.div>
      )}

      {/* Admin dashboard shortcut */}
      {user.role === "admin" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="border border-primary/50 bg-primary/5 rounded-sm p-6 flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <ShieldCheck className="w-8 h-8 text-primary" />
            <div>
              <h4 className="font-heading font-bold uppercase text-primary">Admin Access Active</h4>
              <p className="font-mono text-xs text-muted-foreground">Manage products, prices, and inventory from the dashboard.</p>
            </div>
          </div>
          <Link to="/dashboard">
            <motion.button
              whileHover={{ x: 4 }}
              className="flex items-center gap-2 font-mono text-sm text-primary uppercase"
            >
              Open <ChevronRight className="w-4 h-4" />
            </motion.button>
          </Link>
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex justify-end">
        <button
          onClick={() => logout()}
          className="flex items-center gap-2 px-5 py-2.5 border border-border text-muted-foreground font-mono text-sm hover:border-destructive hover:text-destructive transition-colors rounded-sm"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

function AuthForm() {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "", employeeCode: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setUser } = useUserStore();

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (tab === "signup" && form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const path = tab === "login" ? "/auth/login" : "/auth/register";
      const body = tab === "login"
        ? { email: form.email, password: form.password, ...(form.employeeCode.trim() ? { employeeCode: form.employeeCode.trim() } : {}) }
        : { username: form.username, email: form.email, password: form.password, ...(form.employeeCode.trim() ? { employeeCode: form.employeeCode.trim() } : {}) };
      const user = await apiFetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setUser(user);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="flex gap-0 mb-8 border border-border rounded-sm overflow-hidden">
        {(["login", "signup"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(""); }}
            className={`flex-1 py-3 font-heading font-bold uppercase text-sm tracking-wider transition-colors ${tab === t ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
          >
            {t === "login" ? "Sign In" : "Create Account"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.form
          key={tab}
          initial={{ opacity: 0, x: tab === "login" ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          {tab === "signup" && (
            <div>
              <label className="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Operator Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  required
                  value={form.username}
                  onChange={(e) => update("username", e.target.value)}
                  placeholder="your_callsign"
                  className="w-full bg-card border border-border rounded-sm pl-10 pr-4 py-3 font-mono text-sm focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Secure Channel</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="operator@domain.com"
                className="w-full bg-card border border-border rounded-sm pl-10 pr-4 py-3 font-mono text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Access Code</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                placeholder="••••••••"
                className="w-full bg-card border border-border rounded-sm pl-10 pr-4 py-3 font-mono text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          {tab === "signup" && (
            <div>
              <label className="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Confirm Code</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={form.confirm}
                  onChange={(e) => update("confirm", e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-card border border-border rounded-sm pl-10 pr-4 py-3 font-mono text-sm focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">
              Employee Access Code <span className="normal-case tracking-normal text-muted-foreground/50">optional</span>
            </label>
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={form.employeeCode}
                onChange={(e) => update("employeeCode", e.target.value)}
                placeholder="AXIOM-EMPLOYEE-2024"
                autoComplete="off"
                className="w-full bg-card border border-border rounded-sm pl-10 pr-4 py-3 font-mono text-sm focus:outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/20 transition-colors"
              />
            </div>
            <p className="font-mono text-xs text-muted-foreground/50 mt-1.5">
              {tab === "login" ? "Entering your code here will upgrade an existing account to admin." : "For AxiomCraft staff only. Grants admin access."}
            </p>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-mono text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded-sm px-4 py-2"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 bg-primary text-primary-foreground font-heading font-bold uppercase tracking-wider rounded-sm hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {loading ? "Processing..." : tab === "login" ? "Initialize Session" : "Register Operator"}
          </motion.button>
        </motion.form>
      </AnimatePresence>
    </div>
  );
}

export default function Account() {
  const { user, fetchMe } = useUserStore();

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  return (
    <Layout>
      <section className="relative pt-28 pb-16 border-b border-border overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,240,255,0.06),transparent_70%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-primary/30 bg-primary/5 rounded-sm mb-6">
              <User className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-mono tracking-widest text-primary uppercase">Operator Portal</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-heading font-bold uppercase tracking-tighter">
              {user ? "Mission Control" : "Identify Yourself"}
            </h1>
          </motion.div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {user ? <ProfileView /> : <AuthForm />}
        </div>
      </section>
    </Layout>
  );
}
