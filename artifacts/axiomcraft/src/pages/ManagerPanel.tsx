import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { useUserStore, isManager } from "@/store/user-store";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Building2, Package, Check, X, Save, Search, AlertTriangle, ToggleLeft, ToggleRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API = import.meta.env.VITE_API_URL || `${import.meta.env.BASE_URL}api`;

interface Product {
  id: number;
  name: string;
  slug: string;
  category: string;
  sku: string;
  imageUrl: string;
  basePrice: number;
  salePrice: number | null;
  stock: number;
  branchData: {
    available: boolean;
    stock: number | null;
    discount: string | null;
    featured: boolean;
    notes: string;
  } | null;
}

interface Branch {
  id: number;
  name: string;
  location: string;
  contact: string;
}

interface EditState {
  available: boolean;
  stock: string;
  discount: string;
  featured: boolean;
  notes: string;
}

function EditRow({ product, onSave, onCancel }: { product: Product; onSave: (state: EditState) => void; onCancel: () => void }) {
  const [form, setForm] = useState<EditState>({
    available: product.branchData?.available ?? true,
    stock: product.branchData?.stock !== null && product.branchData?.stock !== undefined ? String(product.branchData.stock) : "",
    discount: product.branchData?.discount ?? "",
    featured: product.branchData?.featured ?? false,
    notes: product.branchData?.notes ?? "",
  });

  const inputCls = "w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary transition-colors";

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-card/50 border-l-2 border-primary px-4 py-4 col-span-full"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Branch Stock <span className="normal-case text-muted-foreground/60">(blank = global)</span></label>
          <input className={inputCls} type="number" min="0" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} placeholder="Leave blank to use global" />
        </div>
        <div>
          <label className="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Branch Discount %</label>
          <input className={inputCls} type="number" min="0" max="100" step="0.01" value={form.discount} onChange={(e) => setForm((f) => ({ ...f, discount: e.target.value }))} placeholder="0" />
        </div>
        <div>
          <label className="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Notes</label>
          <input className={inputCls} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Internal notes..." />
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setForm((f) => ({ ...f, available: !f.available }))}>
              {form.available ? <ToggleRight className="w-8 h-8 text-primary" /> : <ToggleLeft className="w-8 h-8 text-muted-foreground" />}
            </button>
            <span className="font-mono text-sm">{form.available ? "Available" : "Not Available"}</span>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setForm((f) => ({ ...f, featured: !f.featured }))}>
              {form.featured ? <ToggleRight className="w-8 h-8 text-primary" /> : <ToggleLeft className="w-8 h-8 text-muted-foreground" />}
            </button>
            <span className="font-mono text-sm">{form.featured ? "Featured" : "Not Featured"}</span>
          </div>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={() => onSave(form)} className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground font-heading font-bold uppercase text-sm rounded-sm hover:bg-primary/90 transition-colors">
          <Save className="w-4 h-4" /> Save
        </button>
        <button onClick={onCancel} className="px-4 py-2 border border-border font-mono text-sm rounded-sm hover:bg-muted/20 transition-colors">Cancel</button>
      </div>
    </motion.div>
  );
}

export default function ManagerPanel() {
  const { user } = useUserStore();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [branch, setBranch] = useState<Branch | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const fetchBranchData = useCallback(async (branchId: number) => {
    setLoading(true);
    try {
      const [branchRes, productsRes] = await Promise.all([
        fetch(`${API}/branches`, { credentials: "include" }),
        fetch(`${API}/branches/${branchId}/products`, { credentials: "include" }),
      ]);
      if (branchRes.ok) {
        const branches = await branchRes.json();
        setBranch(branches.find((b: Branch) => b.id === branchId) || null);
      }
      if (productsRes.ok) {
        setProducts(await productsRes.json());
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) { navigate("/account"); return; }
    if (!isManager(user)) { navigate("/"); return; }
    if (!user.branchId) { navigate("/"); return; }
    fetchBranchData(user.branchId);
  }, [user, navigate, fetchBranchData]);

  const handleSave = async (productId: number, form: EditState) => {
    if (!user?.branchId) return;
    try {
      const res = await fetch(`${API}/branches/${user.branchId}/products/${productId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          available: form.available,
          stock: form.stock !== "" ? parseInt(form.stock) : null,
          discount: form.discount !== "" ? parseFloat(form.discount) : null,
          featured: form.featured,
          notes: form.notes,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProducts((prev) => prev.map((p) => p.id === productId ? { ...p, branchData: updated } : p));
        toast({ title: "Product updated for this branch" });
        setEditingId(null);
      } else {
        const j = await res.json();
        toast({ title: "Error", description: j.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error saving", variant: "destructive" });
    }
  };

  if (!user || !isManager(user)) {
    return (
      <Layout>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
          <Lock className="w-12 h-12 text-muted-foreground" />
          <p className="font-heading font-bold text-xl uppercase">Manager Access Required</p>
        </div>
      </Layout>
    );
  }

  const filtered = products.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-2 font-mono text-xs text-primary uppercase tracking-widest mb-3">
            <Building2 className="w-3.5 h-3.5" /> Branch Manager Panel
          </div>
          <h1 className="text-4xl md:text-5xl font-heading font-black uppercase tracking-tight">
            {branch?.name || "MY BRANCH"}
          </h1>
          {branch && (
            <p className="text-muted-foreground font-mono mt-1">
              {branch.location && <span>{branch.location} · </span>}
              {branch.contact && <span>{branch.contact} · </span>}
              Logged in as <span className="text-primary">{user.username}</span>
            </p>
          )}
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Products", value: products.length, icon: Package },
            { label: "Available", value: products.filter((p) => p.branchData?.available !== false).length, icon: Check },
            { label: "Unavailable", value: products.filter((p) => p.branchData?.available === false).length, icon: AlertTriangle },
            { label: "Featured", value: products.filter((p) => p.branchData?.featured).length, icon: Building2 },
          ].map(({ label, value, icon: Icon }) => (
            <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-sm p-4">
              <Icon className="w-4 h-4 text-muted-foreground mb-2" />
              <p className="font-mono text-2xl font-bold">{value}</p>
              <p className="font-mono text-xs text-muted-foreground mt-0.5">{label}</p>
            </motion.div>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-sm font-mono text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <span className="font-mono text-xs text-muted-foreground">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Products table */}
        {loading ? (
          <div className="space-y-2">{Array(5).fill(0).map((_, i) => <div key={i} className="h-16 bg-card border border-border rounded-sm animate-pulse" />)}</div>
        ) : (
          <div className="border border-border rounded-sm overflow-hidden">
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] bg-muted/20 px-4 py-2.5 border-b border-border">
              {["", "Product", "Global Price", "Branch Status", "Discount", "Edit"].map((h) => (
                <span key={h} className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{h}</span>
              ))}
            </div>
            <div className="divide-y divide-border">
              <AnimatePresence>
                {filtered.map((p) => {
                  const bd = p.branchData;
                  const available = bd?.available !== false;
                  return (
                    <>
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 px-4 py-3 hover:bg-muted/10 transition-colors"
                      >
                        <img
                          src={p.imageUrl || `https://picsum.photos/seed/${p.slug}/80/80`}
                          alt={p.name}
                          className="w-10 h-10 object-cover rounded-sm bg-muted shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-heading font-bold text-sm truncate">{p.name}</p>
                          <p className="font-mono text-xs text-muted-foreground truncate">{p.sku}</p>
                          {bd?.notes && <p className="font-mono text-xs text-primary/70 truncate">{bd.notes}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`font-mono text-sm font-bold ${p.salePrice ? "text-primary" : ""}`}>${(p.salePrice ?? p.basePrice).toLocaleString()}</p>
                          {bd?.stock !== null && bd?.stock !== undefined && (
                            <p className="font-mono text-xs text-muted-foreground">Branch stock: {bd.stock}</p>
                          )}
                        </div>
                        <span className={`font-mono text-xs px-2 py-1 rounded-sm shrink-0 ${available ? "bg-green-400/20 text-green-400" : "bg-destructive/20 text-destructive"}`}>
                          {available ? "Available" : "Unavailable"}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground shrink-0">
                          {bd?.discount ? `-${bd.discount}%` : "—"}
                        </span>
                        <button
                          onClick={() => setEditingId(editingId === p.id ? null : p.id)}
                          className="p-1.5 text-muted-foreground hover:text-primary border border-transparent hover:border-primary/30 rounded-sm transition-all shrink-0"
                        >
                          {editingId === p.id ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                      </motion.div>
                      <AnimatePresence>
                        {editingId === p.id && (
                          <EditRow
                            key={`edit-${p.id}`}
                            product={p}
                            onSave={(form) => handleSave(p.id, form)}
                            onCancel={() => setEditingId(null)}
                          />
                        )}
                      </AnimatePresence>
                    </>
                  );
                })}
              </AnimatePresence>
              {filtered.length === 0 && <div className="py-12 text-center font-mono text-sm text-muted-foreground">No products found</div>}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
