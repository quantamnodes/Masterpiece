import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { useListProducts, type Product } from "@workspace/api-client-react";
import { X, Plus, ArrowRight, CheckCircle, XCircle } from "lucide-react";
import { useCartManager } from "@/hooks/use-cart-manager";
import { useToast } from "@/hooks/use-toast";
import { useCompareStore } from "@/store/compare-store";

type ProductSummary = Product;

const MAX_COMPARE = 3;

function ProductPicker({ onAdd }: { onAdd: (p: ProductSummary) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  const { data } = useListProducts({ category: category || undefined });
  const products: ProductSummary[] = data?.products || [];
  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="border border-border bg-card rounded-sm p-6">
      <h3 className="font-heading font-bold uppercase mb-4">Add Product to Compare</h3>
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products..."
          className="flex-1 bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary transition-colors"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary transition-colors"
        >
          <option value="">All</option>
          {["gpus", "cpus", "motherboards", "memory", "storage", "psus"].map((c) => (
            <option key={c} value={c}>{c.toUpperCase()}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {filtered.slice(0, 20).map((p) => (
          <button
            key={p.id}
            onClick={() => onAdd(p)}
            className="w-full flex items-center gap-3 p-3 hover:bg-muted/30 rounded-sm transition-colors text-left group"
          >
            <img src={p.imageUrl || `https://picsum.photos/seed/${p.slug}/60/60`} alt={p.name} className="w-10 h-10 object-cover rounded-sm bg-muted shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-heading font-bold text-sm group-hover:text-primary transition-colors truncate">{p.name}</p>
              <p className="font-mono text-xs text-muted-foreground">{p.category}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono text-sm">${(p.salePrice ?? p.basePrice).toLocaleString()}</span>
              <Plus className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-center font-mono text-sm text-muted-foreground py-4">No products found</p>
        )}
      </div>
    </div>
  );
}

// Gather all unique spec names across all products
function getAllSpecKeys(products: ProductSummary[]) {
  const keys = new Set<string>();
  products.forEach((p) => {
    (p.specs || []).forEach((s) => keys.add(s.name));
  });
  return Array.from(keys);
}

function getSpecValue(product: ProductSummary, key: string): string {
  const spec = (product.specs || []).find((s) => s.name === key);
  return spec?.value || "—";
}

export default function Compare() {
  const [compareList, setCompareList] = useState<ProductSummary[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const { addToCart } = useCartManager();
  const { toast } = useToast();
  const { items: storeItems } = useCompareStore();

  const { data: allProductsData } = useListProducts({});

  useEffect(() => {
    if (storeItems.length === 0 || !allProductsData?.products) return;
    const allProducts = allProductsData.products;
    const preloaded = storeItems
      .map((si) => allProducts.find((p) => p.id === si.id))
      .filter(Boolean) as ProductSummary[];
    if (preloaded.length > 0) {
      setCompareList(preloaded.slice(0, MAX_COMPARE));
    }
  }, [allProductsData?.products?.length, storeItems.length]);

  const addProduct = (p: ProductSummary) => {
    if (compareList.find((c) => c.id === p.id)) return;
    if (compareList.length >= MAX_COMPARE) return;
    setCompareList((l) => [...l, p]);
    setShowPicker(false);
  };

  const removeProduct = (id: number) => {
    setCompareList((l) => l.filter((p) => p.id !== id));
  };

  const specKeys = getAllSpecKeys(compareList);

  return (
    <Layout>
      <section className="relative pt-28 pb-12 border-b border-border overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,240,255,0.06),transparent_60%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="inline-flex items-center gap-2 px-3 py-1 border border-primary/30 bg-primary/5 rounded-sm mb-6">
            <ArrowRight className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-mono tracking-widest text-primary uppercase">Side-by-Side Analysis</span>
          </motion.div>
          <h1 className="text-5xl md:text-7xl font-heading font-bold uppercase tracking-tighter">
            Compare <span className="text-primary">Hardware</span>
          </h1>
          <p className="mt-4 text-muted-foreground font-mono">Select up to 3 components to compare specifications side-by-side.</p>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Comparison table */}
          {compareList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr>
                    <td className="w-48 pr-4 pb-6 align-top">
                      <p className="font-mono text-xs uppercase text-muted-foreground">Comparing {compareList.length} product{compareList.length > 1 ? "s" : ""}</p>
                    </td>
                    {compareList.map((p) => (
                      <td key={p.id} className="pb-6 px-3 align-top">
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="border border-border bg-card rounded-sm overflow-hidden"
                        >
                          <div className="relative">
                            <img
                              src={p.imageUrl || `https://picsum.photos/seed/${p.slug}/400/300`}
                              alt={p.name}
                              className="w-full aspect-[4/3] object-cover"
                            />
                            <button
                              onClick={() => removeProduct(p.id)}
                              className="absolute top-2 right-2 w-6 h-6 bg-background/80 rounded-sm flex items-center justify-center hover:bg-destructive/20 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="p-4">
                            <p className="font-mono text-xs text-muted-foreground">{p.category}</p>
                            <Link to={`/products/${p.id}`}>
                              <h3 className="font-heading font-bold uppercase text-sm hover:text-primary transition-colors leading-tight mt-0.5">{p.name}</h3>
                            </Link>
                            <div className="mt-2">
                              {p.salePrice ? (
                                <>
                                  <span className="font-mono text-lg font-bold text-primary">${p.salePrice.toLocaleString()}</span>
                                  <span className="font-mono text-sm text-muted-foreground line-through ml-2">${p.basePrice.toLocaleString()}</span>
                                </>
                              ) : (
                                <span className="font-mono text-lg font-bold">${p.basePrice.toLocaleString()}</span>
                              )}
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              disabled={p.stock <= 0}
                              onClick={async () => {
                                try {
                                  await addToCart(p.id, 1);
                                  toast({ title: "Added to Cart", description: p.name, className: "bg-card border-primary" });
                                } catch {
                                  toast({ title: "Error", variant: "destructive" });
                                }
                              }}
                              className="mt-3 w-full py-2 bg-primary text-primary-foreground font-mono text-xs uppercase rounded-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
                            >
                              {p.stock <= 0 ? "Out of Stock" : "Add to Cart"}
                            </motion.button>
                          </div>
                        </motion.div>
                      </td>
                    ))}
                    {compareList.length < MAX_COMPARE && (
                      <td className="pb-6 px-3 align-top">
                        <button
                          onClick={() => setShowPicker(true)}
                          className="w-full aspect-square min-h-[200px] border-2 border-dashed border-border rounded-sm flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors group"
                        >
                          <Plus className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                          <span className="font-mono text-xs text-muted-foreground group-hover:text-primary transition-colors uppercase">Add product</span>
                        </button>
                      </td>
                    )}
                  </tr>
                </thead>

                {/* Stock row */}
                <tbody>
                  <tr className="border-t border-border">
                    <td className="py-3 pr-4 font-mono text-xs uppercase text-muted-foreground">In Stock</td>
                    {compareList.map((p) => (
                      <td key={p.id} className="py-3 px-3 text-center">
                        {p.stock > 0
                          ? <CheckCircle className="w-5 h-5 text-primary mx-auto" />
                          : <XCircle className="w-5 h-5 text-destructive mx-auto" />}
                      </td>
                    ))}
                  </tr>

                  {/* Spec rows */}
                  {specKeys.map((key, i) => (
                    <motion.tr
                      key={key}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`border-t border-border/50 ${i % 2 === 0 ? "bg-muted/10" : ""}`}
                    >
                      <td className="py-3 pr-4 font-mono text-xs uppercase text-muted-foreground">{key}</td>
                      {compareList.map((p) => (
                        <td key={p.id} className="py-3 px-3 font-mono text-sm text-center">
                          {getSpecValue(p, key)}
                        </td>
                      ))}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 border border-border rounded-sm flex items-center justify-center mx-auto mb-4">
                <ArrowRight className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-heading font-bold uppercase mb-2">Start Comparing</h3>
              <p className="text-muted-foreground font-mono mb-8">Add products to see a side-by-side specification breakdown.</p>
            </div>
          )}

          {/* Add product trigger */}
          {compareList.length === 0 && (
            <div className="flex justify-center mt-4">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowPicker(true)}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-heading font-bold uppercase tracking-wider rounded-sm"
              >
                <Plus className="w-5 h-5" />
                Add First Product
              </motion.button>
            </div>
          )}

          {/* Picker */}
          {showPicker && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-heading font-bold uppercase">Select a Product</h3>
                <button onClick={() => setShowPicker(false)} className="p-1 hover:text-destructive transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ProductPicker onAdd={addProduct} />
            </motion.div>
          )}
        </div>
      </section>
    </Layout>
  );
}
