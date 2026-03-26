import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { Tag, Zap, ArrowRight, ShoppingCart } from "lucide-react";
import { useCartManager } from "@/hooks/use-cart-manager";
import { useToast } from "@/hooks/use-toast";

const API_BASE = (() => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${base}/api`;
})();

interface Deal {
  id: number;
  name: string;
  slug: string;
  category: string;
  shortDescription: string;
  basePrice: number;
  salePrice: number;
  discount: number;
  imageUrl: string;
  stock: number;
  badge: string | null;
}

function DealCard({ deal, index }: { deal: Deal; index: number }) {
  const { addToCart, isAdding } = useCartManager();
  const { toast } = useToast();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.07 }}
      whileHover={{ y: -4 }}
      className="group border border-border bg-card rounded-sm overflow-hidden hover:border-primary/50 transition-colors"
    >
      <Link to={`/products/${deal.id}`} className="block relative overflow-hidden aspect-[4/3]">
        <img
          src={deal.imageUrl || `https://picsum.photos/seed/${deal.slug}/600/400`}
          alt={deal.name}
          className="w-full h-full object-cover mix-blend-luminosity group-hover:mix-blend-normal transition-all duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="px-2 py-1 bg-destructive text-destructive-foreground font-mono text-xs font-bold uppercase rounded-sm">
            -{deal.discount}%
          </span>
          {deal.badge && (
            <span className="px-2 py-1 bg-primary text-primary-foreground font-mono text-xs font-bold uppercase rounded-sm">
              {deal.badge}
            </span>
          )}
        </div>
      </Link>

      <div className="p-5">
        <p className="font-mono text-xs uppercase text-muted-foreground mb-1">{deal.category}</p>
        <Link to={`/products/${deal.id}`}>
          <h3 className="font-heading font-bold uppercase text-lg leading-tight mb-2 group-hover:text-primary transition-colors line-clamp-2">
            {deal.name}
          </h3>
        </Link>
        <p className="font-sans text-sm text-muted-foreground mb-4 line-clamp-2">{deal.shortDescription}</p>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-mono font-bold text-primary">${deal.salePrice.toLocaleString()}</span>
            <span className="text-sm font-mono text-muted-foreground line-through ml-2">${deal.basePrice.toLocaleString()}</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={deal.stock <= 0 || isAdding}
            onClick={async (e) => {
              e.preventDefault();
              try {
                await addToCart(deal.id, 1);
                toast({ title: "Added to Cart", description: `${deal.name} → loadout`, className: "bg-card border-primary" });
              } catch {
                toast({ title: "Error", variant: "destructive" });
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground font-mono text-xs uppercase rounded-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Add
          </motion.button>
        </div>

        {deal.stock <= 5 && deal.stock > 0 && (
          <p className="font-mono text-xs text-orange-400 mt-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse inline-block" />
            Only {deal.stock} left
          </p>
        )}
      </div>
    </motion.div>
  );
}

export default function Deals() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/deals`)
      .then((r) => r.json())
      .then((d) => setDeals(d.deals || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalSavings = deals.reduce((acc, d) => acc + (d.basePrice - d.salePrice), 0);

  return (
    <Layout>
      {/* Hero */}
      <section className="relative pt-28 pb-16 border-b border-border overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(240,68,68,0.08),transparent_70%)] pointer-events-none" />
        <motion.div
          className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-destructive/40 to-transparent"
          animate={{ top: ["0%", "100%"] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="inline-flex items-center gap-2 px-3 py-1 border border-destructive/30 bg-destructive/5 rounded-sm mb-6">
            <Zap className="w-3.5 h-3.5 text-destructive" />
            <span className="text-xs font-mono tracking-widest text-destructive uppercase">Flash Deals Active</span>
          </motion.div>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              {"DEALS VAULT".split(" ").map((w, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="inline-block mr-4 text-5xl md:text-7xl font-heading font-bold uppercase tracking-tighter text-foreground"
                >
                  {w}
                </motion.span>
              ))}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-muted-foreground font-mono mt-4"
              >
                Premium hardware — reduced. Limited stock. Zero compromise.
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="border border-destructive/30 bg-destructive/5 rounded-sm p-6 text-right shrink-0"
            >
              <div className="text-3xl font-mono font-bold text-destructive">${totalSavings.toLocaleString()}</div>
              <div className="font-mono text-xs uppercase text-muted-foreground">Total savings available</div>
              <div className="font-mono text-xs text-muted-foreground mt-1">{deals.length} products discounted</div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="border border-border bg-card rounded-sm overflow-hidden animate-pulse">
                  <div className="aspect-[4/3] bg-muted/30" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-muted/30 rounded w-1/3" />
                    <div className="h-6 bg-muted/30 rounded w-3/4" />
                    <div className="h-4 bg-muted/30 rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : deals.length === 0 ? (
            <div className="text-center py-24">
              <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-2xl font-heading font-bold uppercase mb-2">No Active Deals</h3>
              <p className="text-muted-foreground font-mono mb-8">Check back soon — new deals drop weekly.</p>
              <Link to="/products">
                <button className="px-6 py-3 border border-primary text-primary font-mono text-sm uppercase hover:bg-primary hover:text-primary-foreground transition-colors rounded-sm flex items-center gap-2 mx-auto">
                  Browse Full Catalog <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {deals.map((deal, i) => (
                <DealCard key={deal.id} deal={deal} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
