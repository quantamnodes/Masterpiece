import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { motion } from "framer-motion";
import { ShoppingBag, Package, ArrowRight, Tag } from "lucide-react";
import { useCartManager } from "@/hooks/use-cart-manager";
import { useToast } from "@/hooks/use-toast";

const API = import.meta.env.VITE_API_URL || `${import.meta.env.BASE_URL}api`;

interface BundleProduct {
  id: number;
  name: string;
  slug: string;
  category: string;
  imageUrl: string;
  basePrice: number;
  salePrice: number | null;
  stock: number;
}

interface BundleItem {
  productId: number;
  quantity: number;
  product?: BundleProduct;
}

interface Bundle {
  id: number;
  slug: string;
  name: string;
  description: string;
  active: boolean;
  discountPct: number;
  badgeText: string;
  imageUrl: string;
  items: BundleItem[];
  subtotal: number;
  bundlePrice: number;
}

function BundleCard({ bundle }: { bundle: Bundle }) {
  const { addItem } = useCartManager();
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);

  const handleAddAll = async () => {
    setAdding(true);
    try {
      for (const item of bundle.items) {
        if (item.product && item.product.stock > 0) {
          await addItem(item.productId, item.quantity);
        }
      }
      toast({ title: "Bundle added to cart", description: `${bundle.name} — ${bundle.items.length} items` });
    } finally {
      setAdding(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-card border border-border rounded-sm overflow-hidden"
    >
      {bundle.imageUrl && (
        <div className="h-48 overflow-hidden">
          <img src={bundle.imageUrl} alt={bundle.name} className="w-full h-full object-cover mix-blend-luminosity opacity-80" />
        </div>
      )}
      <div className="p-6 space-y-4">
        <div>
          {bundle.badgeText && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary/30 text-primary font-mono text-xs uppercase tracking-wider rounded-sm mb-3">
              <Tag className="w-3 h-3" /> {bundle.badgeText}
            </span>
          )}
          <h2 className="font-heading font-bold text-2xl uppercase">{bundle.name}</h2>
          {bundle.description && <p className="text-muted-foreground text-sm font-sans mt-1">{bundle.description}</p>}
        </div>

        {bundle.items.length > 0 && (
          <div className="space-y-2">
            <p className="font-mono text-xs uppercase text-muted-foreground tracking-wider">Included Hardware</p>
            {bundle.items.map((item) => (
              <div key={item.productId} className="flex items-center gap-3">
                {item.product?.imageUrl && (
                  <img src={item.product.imageUrl} alt={item.product?.name} className="w-10 h-10 object-cover rounded-sm bg-muted" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm truncate">{item.product?.name || `Product #${item.productId}`}</p>
                  <p className="font-mono text-xs text-muted-foreground">×{item.quantity}</p>
                </div>
                {item.product && (
                  <Link to={`/products/${item.productId}`} className="font-mono text-xs text-primary hover:underline shrink-0">View</Link>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-border pt-4 flex items-center justify-between">
          <div>
            {bundle.subtotal > bundle.bundlePrice && (
              <p className="font-mono text-xs text-muted-foreground line-through">${bundle.subtotal.toLocaleString()}</p>
            )}
            <p className="font-mono font-bold text-2xl text-primary">
              ${bundle.bundlePrice.toLocaleString()}
              {bundle.discountPct > 0 && (
                <span className="ml-2 text-sm font-normal text-emerald-400">-{bundle.discountPct}%</span>
              )}
            </p>
          </div>
          <button
            onClick={handleAddAll}
            disabled={adding}
            className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground font-heading font-bold uppercase tracking-wider text-sm rounded-sm hover:bg-primary/90 transition-all disabled:opacity-60"
          >
            {adding ? (
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <ShoppingBag className="w-4 h-4" />
            )}
            Add Bundle
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function Bundles() {
  const { slug } = useParams<{ slug?: string }>();
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = slug ? `${API}/bundles/${slug}` : `${API}/bundles`;
    fetch(url)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) { setBundles([]); return; }
        setBundles(Array.isArray(data) ? data : [data]);
      })
      .catch(() => setBundles([]))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-16 space-y-12">
        <div>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-mono text-xs uppercase tracking-widest text-primary mb-2"
          >
            Curated Hardware
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="font-heading font-bold text-4xl md:text-5xl uppercase leading-tight"
          >
            {slug ? "Bundle" : "All Bundles"}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground font-sans text-lg mt-3 max-w-xl"
          >
            Pre-configured hardware bundles for creators, students, and enthusiasts — at an exclusive discount.
          </motion.p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-60 text-muted-foreground font-mono">
            Loading bundles…
          </div>
        ) : bundles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 border border-dashed border-border rounded-sm text-center">
            <Package className="w-16 h-16 text-muted-foreground mb-6 opacity-40" />
            <h2 className="font-heading text-2xl font-bold uppercase mb-2">No bundles available</h2>
            <p className="text-muted-foreground font-mono text-sm mb-6">Check back soon — curated bundles are coming.</p>
            <Link to="/products">
              <button className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-heading font-bold uppercase text-sm rounded-sm hover:bg-primary/90 transition-all">
                Browse Products <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {bundles.map((bundle) => (
              <BundleCard key={bundle.id} bundle={bundle} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
