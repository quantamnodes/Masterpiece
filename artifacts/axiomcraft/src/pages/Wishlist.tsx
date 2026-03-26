import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { useUserStore } from "@/store/user-store";
import { useWishlistStore } from "@/store/wishlist-store";
import { useCartManager } from "@/hooks/use-cart-manager";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ShoppingCart, Trash2, ArrowRight, Lock } from "lucide-react";

const API = import.meta.env.VITE_API_URL || `${import.meta.env.BASE_URL}api`;

interface WishlistItem {
  id: number;
  productId: number;
  name: string;
  slug: string;
  category: string;
  basePrice: string;
  salePrice: string | null;
  imageUrl: string;
  badge: string | null;
  stock: number;
}

export default function Wishlist() {
  const { user } = useUserStore();
  const { ids, removeFromWishlist } = useWishlistStore();
  const { addToCart } = useCartManager();
  const { toast } = useToast();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetch(`${API}/wishlist`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, ids.length]);

  const handleRemove = async (productId: number) => {
    await removeFromWishlist(productId);
    setItems((prev) => prev.filter((i) => i.productId !== productId));
    toast({ title: "Removed from wishlist" });
  };

  const handleAddToCart = async (productId: number, name: string) => {
    await addToCart(productId, 1);
    toast({ title: "Added to cart", description: `${name} added to your cart.` });
  };

  if (!user) {
    return (
      <Layout>
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-center px-4">
          <Lock className="w-12 h-12 text-muted-foreground" />
          <h1 className="text-3xl font-heading font-bold uppercase">Sign in to view wishlist</h1>
          <p className="text-muted-foreground font-mono">Your saved items are waiting.</p>
          <Link to="/account" className="px-6 py-3 bg-primary text-primary-foreground font-heading font-bold uppercase text-sm rounded-sm hover:bg-primary/90 transition-colors">
            Sign In
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-12">
          <div className="flex items-center gap-2 font-mono text-xs text-primary uppercase tracking-widest mb-3">
            <Heart className="w-3.5 h-3.5" /> Saved Items
          </div>
          <h1 className="text-4xl md:text-5xl font-heading font-black uppercase tracking-tight mb-2">
            MY WISHLIST
          </h1>
          <p className="text-muted-foreground font-mono">{ids.length} item{ids.length !== 1 ? "s" : ""} saved</p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-28 bg-card border border-border rounded-sm animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border border-border rounded-sm p-16 text-center"
          >
            <Heart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="font-heading font-bold text-xl uppercase mb-2">Your wishlist is empty</p>
            <p className="text-muted-foreground font-mono text-sm mb-6">Save items from the catalog to revisit them later.</p>
            <Link to="/products" className="inline-flex items-center gap-2 px-6 py-3 border border-primary text-primary font-heading font-bold uppercase text-sm hover:bg-primary/10 transition-colors rounded-sm">
              Browse Catalog <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {items.map((item, i) => {
                const price = item.salePrice ? parseFloat(item.salePrice) : parseFloat(item.basePrice);
                const hasDiscount = !!item.salePrice;
                const discountPct = hasDiscount ? Math.round((1 - parseFloat(item.salePrice!) / parseFloat(item.basePrice)) * 100) : 0;
                const inStock = item.stock > 0;
                const imageUrl = item.imageUrl || `https://picsum.photos/seed/${item.slug}/400/300`;

                return (
                  <motion.div
                    key={item.productId}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -40, height: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className="flex items-center gap-5 bg-card border border-border rounded-sm p-4 hover:border-primary/30 transition-colors group"
                  >
                    <Link to={`/products/${item.productId}`} className="shrink-0">
                      <img src={imageUrl} alt={item.name} className="w-20 h-20 object-cover rounded-sm bg-muted" />
                    </Link>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <Link to={`/products/${item.productId}`}>
                            <p className="font-heading font-bold text-base group-hover:text-primary transition-colors line-clamp-1">
                              {item.name}
                            </p>
                          </Link>
                          <p className="font-mono text-xs text-muted-foreground uppercase mt-0.5">{item.category}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`font-mono text-lg font-bold ${hasDiscount ? "text-primary" : ""}`}>
                            ${price.toLocaleString()}
                          </p>
                          {hasDiscount && (
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="font-mono text-xs text-muted-foreground line-through">${parseFloat(item.basePrice).toLocaleString()}</span>
                              <span className="text-[10px] font-mono font-bold bg-destructive/20 text-destructive px-1 rounded">-{discountPct}%</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-3">
                        <button
                          onClick={() => handleAddToCart(item.productId, item.name)}
                          disabled={!inStock}
                          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-heading font-bold uppercase text-xs rounded-sm hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          {inStock ? "Add to Cart" : "Out of Stock"}
                        </button>
                        <button
                          onClick={() => handleRemove(item.productId)}
                          className="flex items-center gap-1.5 px-3 py-2 border border-border text-muted-foreground hover:border-destructive/50 hover:text-destructive font-mono text-xs rounded-sm transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove
                        </button>
                        {!inStock && (
                          <span className="font-mono text-xs text-destructive">Out of stock</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Footer summary */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="border-t border-border pt-6 mt-6 flex items-center justify-between"
            >
              <p className="font-mono text-sm text-muted-foreground">{items.length} saved item{items.length !== 1 ? "s" : ""}</p>
              <Link to="/products" className="flex items-center gap-2 font-mono text-sm text-primary hover:underline">
                Continue browsing <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </motion.div>
          </div>
        )}
      </div>
    </Layout>
  );
}
