import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { useUserStore } from "@/store/user-store";
import { Crown, Zap, Lock, Star } from "lucide-react";
import { useListProducts } from "@workspace/api-client-react";
import { ProductCard } from "@/components/ProductCard";

const PLATINUM_DEALS = [
  { label: "CLASSIFIED CLEARANCE", discount: 25, tag: "GPU Tier" },
  { label: "OPERATOR EXCLUSIVE", discount: 20, tag: "CPU Tier" },
  { label: "VAULT ACCESS", discount: 30, tag: "Limited Stock" },
];

export default function Platinum() {
  const { user, fetchMe } = useUserStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const { data } = useListProducts({ sortBy: "price_desc" });
  const products = data?.products.slice(0, 4) || [];

  if (!user) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
          <Lock className="w-16 h-16 text-muted-foreground mb-6" />
          <h1 className="text-3xl font-heading font-bold uppercase mb-2">Access Denied</h1>
          <p className="text-muted-foreground font-mono mb-8">Authentication required to access this section.</p>
          <Link to="/account">
            <button className="px-6 py-3 border border-primary text-primary font-mono text-sm uppercase hover:bg-primary hover:text-primary-foreground transition-colors rounded-sm">
              Sign In
            </button>
          </Link>
        </div>
      </Layout>
    );
  }

  if (user.tier !== "platinum") {
    return (
      <Layout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
          <Lock className="w-16 h-16 text-muted-foreground mb-6" />
          <h1 className="text-3xl font-heading font-bold uppercase mb-2">Restricted Area</h1>
          <p className="text-muted-foreground font-mono mb-4">This vault is exclusive to Platinum Operators.</p>
          <p className="font-mono text-xs text-muted-foreground mb-8">
            You are a <span className="text-foreground uppercase">{user.tier}</span> member. Spend $10,000+ lifetime to unlock Platinum.
          </p>
          <Link to="/products">
            <button className="px-6 py-3 bg-primary text-primary-foreground font-heading font-bold uppercase tracking-wider rounded-sm">
              Continue Shopping
            </button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Platinum hero */}
      <section className="relative pt-28 pb-16 border-b border-primary/20 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
          <motion.div
            className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/60 to-transparent"
            animate={{ top: ["0%", "100%"] }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          />
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: "linear-gradient(rgba(0,240,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.06) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3 mb-8"
          >
            <Crown className="w-8 h-8 text-primary" />
            <span className="font-mono text-sm uppercase tracking-widest text-primary">Platinum Vault — Eyes Only</span>
          </motion.div>

          <div className="max-w-3xl">
            {"CLASSIFIED DEALS".split(" ").map((w, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 + i * 0.15, ease: [0.22, 1, 0.36, 1] }}
                className={`inline-block mr-4 text-5xl md:text-7xl font-heading font-bold uppercase tracking-tighter ${i === 0 ? "text-foreground" : "text-primary"}`}
              >
                {w}
              </motion.span>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-muted-foreground font-mono max-w-xl border-l-2 border-primary pl-6"
          >
            Welcome, Platinum Operator. These deals are invisible to the rest of the world. 15% flat discount applies automatically on all purchases.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex items-center gap-2 mt-6 px-4 py-2 border border-primary/30 bg-primary/5 rounded-sm w-fit"
          >
            <Star className="w-4 h-4 text-primary" />
            <span className="font-mono text-sm text-primary">Signed in as {user.username} — Platinum clearance confirmed</span>
          </motion.div>
        </div>
      </section>

      {/* Exclusive discount cards */}
      <section className="py-16 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-heading font-bold uppercase mb-8 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Classified Discount Tiers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLATINUM_DEALS.map((d, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.1 }}
                whileHover={{ y: -4 }}
                className="border border-primary/30 bg-primary/5 rounded-sm p-8 relative overflow-hidden"
              >
                <div className="absolute top-3 right-3">
                  <Crown className="w-5 h-5 text-primary/30" />
                </div>
                <div className="text-5xl font-mono font-bold text-primary mb-2">-{d.discount}%</div>
                <h3 className="font-heading font-bold uppercase text-lg mb-1">{d.label}</h3>
                <p className="font-mono text-xs text-muted-foreground">{d.tag}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Platinum product picks */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-heading font-bold uppercase mb-8">Platinum Picks</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <ProductCard product={p} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
