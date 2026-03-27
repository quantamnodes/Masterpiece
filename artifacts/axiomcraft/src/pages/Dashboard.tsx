import { useState, useEffect, useCallback, useRef } from "react";
import { useUpload } from "@workspace/object-storage-web";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { useUserStore, isOwner } from "@/store/user-store";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Pencil, Trash2, Tag, X, Save, Lock, AlertTriangle, Check,
  ChevronDown, ChevronUp, Search, Package, DollarSign, ImageIcon, Layers,
  Building2, Key, Copy, ToggleLeft, ToggleRight, MapPin, Phone, User,
  BarChart3, TrendingUp, Activity, Star, SlidersHorizontal, Boxes,
  Upload, Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Branch {
  id: number;
  name: string;
  location: string;
  managerId: number | null;
  contact: string;
  active: boolean;
  createdAt: string;
}

interface AccessCode {
  id: number;
  code: string;
  type: string;
  branchId: number | null;
  createdBy: number;
  label: string;
  active: boolean;
  expiresAt: string | null;
  usedBy: number | null;
  createdAt: string;
}

const API = import.meta.env.VITE_API_URL || `${import.meta.env.BASE_URL}api`;

interface Product {
  id: number;
  name: string;
  slug: string;
  category: string;
  categorySlug: string;
  shortDescription: string;
  description: string;
  basePrice: number;
  salePrice: number | null;
  stock: number;
  sku: string;
  imageUrl: string;
  badge: string | null;
  specs: Array<{ name: string; value: string }>;
  variants: unknown[];
  tags: string[];
}

const CATEGORIES = [
  { label: "GPUs", slug: "gpus", name: "Graphics Cards" },
  { label: "CPUs", slug: "cpus", name: "Processors" },
  { label: "Motherboards", slug: "motherboards", name: "Motherboards" },
  { label: "Memory", slug: "memory", name: "RAM & Memory" },
  { label: "Storage", slug: "storage", name: "Storage" },
  { label: "PSUs", slug: "psus", name: "Power Supplies" },
];

const EMPTY_FORM = {
  name: "", slug: "", categorySlug: "gpus", category: "Graphics Cards",
  shortDescription: "", description: "", basePrice: "", salePrice: "",
  stock: "0", sku: "", imageUrl: "", badge: "",
  specs: [{ name: "", value: "" }],
};

type FormData = typeof EMPTY_FORM & { specs: Array<{ name: string; value: string }> };

function ProductImageField({ imageUrl, slug, onChange }: { imageUrl: string; slug: string; onChange: (url: string) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState("");
  const inputCls = "w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary transition-colors";
  const labelCls = "block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-1.5";

  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (response) => {
      onChange(`/api/storage${response.objectPath}`);
      setUploadError("");
    },
    onError: (err) => setUploadError(err.message),
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setUploadError("Only PNG and JPG files are allowed.");
      return;
    }
    setUploadError("");
    await uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const previewSrc = imageUrl || (slug ? `https://picsum.photos/seed/${slug}/400/300` : null);

  return (
    <div>
      <label className={labelCls}>
        Product Image <span className="text-muted-foreground/50 normal-case tracking-normal">URL or upload PNG/JPG</span>
      </label>
      <div className="flex gap-2">
        <input
          className={inputCls}
          value={imageUrl}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`https://picsum.photos/seed/${slug || "product"}/800/600`}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="shrink-0 flex items-center gap-2 px-4 py-2 border border-primary/40 bg-primary/10 text-primary font-mono text-xs uppercase tracking-widest rounded-sm hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {isUploading ? `${progress}%` : "Upload"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {uploadError && <p className="mt-1 font-mono text-xs text-destructive">{uploadError}</p>}
      {previewSrc && (
        <div className="mt-2 flex items-center gap-3">
          <img
            src={previewSrc}
            alt="preview"
            className="w-20 h-16 object-cover rounded-sm border border-border bg-muted"
            onError={(e) => {
              if (slug) (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${slug}/400/300`;
            }}
          />
          <span className="font-mono text-xs text-muted-foreground">Image preview</span>
        </div>
      )}
    </div>
  );
}

function ProductForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Partial<FormData>;
  onSave: (data: FormData) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FormData>({
    ...EMPTY_FORM,
    ...(initial || {}),
    specs: initial?.specs?.length ? initial.specs : [{ name: "", value: "" }],
    basePrice: initial?.basePrice !== undefined ? String(initial.basePrice) : "",
    salePrice: initial?.salePrice !== undefined && initial.salePrice !== null ? String(initial.salePrice) : "",
    stock: initial?.stock !== undefined ? String(initial.stock) : "0",
  });

  const setField = (k: keyof FormData, v: string) =>
    setForm((f) => {
      if (k === "categorySlug") {
        const cat = CATEGORIES.find((c) => c.slug === v);
        return { ...f, categorySlug: v, category: cat?.name || v };
      }
      if (k === "name" && !initial?.slug) {
        const slug = v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        const sku = `AXM-${v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8)}-${Date.now().toString().slice(-4)}`;
        return { ...f, name: v, slug, sku };
      }
      return { ...f, [k]: v };
    });

  const setSpec = (i: number, field: "name" | "value", v: string) =>
    setForm((f) => {
      const specs = [...f.specs];
      specs[i] = { ...specs[i], [field]: v };
      return { ...f, specs };
    });

  const addSpec = () => setForm((f) => ({ ...f, specs: [...f.specs, { name: "", value: "" }] }));
  const removeSpec = (i: number) => setForm((f) => ({ ...f, specs: f.specs.filter((_, idx) => idx !== i) }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...form, specs: form.specs.filter((s) => s.name && s.value) });
  };

  const inputCls = "w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary transition-colors";
  const labelCls = "block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className={labelCls}>Product Name *</label>
          <input className={inputCls} value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="e.g. RTX 5090 Founders Edition" required />
        </div>
        <div>
          <label className={labelCls}>SKU *</label>
          <input className={inputCls} value={form.sku} onChange={(e) => setField("sku", e.target.value)} placeholder="AXM-RTX5090-001" required />
        </div>
        <div>
          <label className={labelCls}>Category *</label>
          <select className={inputCls} value={form.categorySlug} onChange={(e) => setField("categorySlug", e.target.value)}>
            {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.label} — {c.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>URL Slug *</label>
          <input className={inputCls} value={form.slug} onChange={(e) => setField("slug", e.target.value)} placeholder="rtx-5090-fe" required />
        </div>
        <div>
          <label className={labelCls}>Base Price ($) *</label>
          <input className={inputCls} type="number" step="0.01" min="0" value={form.basePrice} onChange={(e) => setField("basePrice", e.target.value)} placeholder="1999.99" required />
        </div>
        <div>
          <label className={labelCls}>Sale Price ($) <span className="text-muted-foreground/50 normal-case tracking-normal">optional</span></label>
          <input className={inputCls} type="number" step="0.01" min="0" value={form.salePrice} onChange={(e) => setField("salePrice", e.target.value)} placeholder="Leave empty for no discount" />
        </div>
        <div>
          <label className={labelCls}>Stock Quantity</label>
          <input className={inputCls} type="number" min="0" value={form.stock} onChange={(e) => setField("stock", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Badge <span className="text-muted-foreground/50 normal-case tracking-normal">optional</span></label>
          <input className={inputCls} value={form.badge} onChange={(e) => setField("badge", e.target.value)} placeholder="NEW / FLAGSHIP / LIMITED" />
        </div>
      </div>

      <ProductImageField
        imageUrl={form.imageUrl}
        slug={form.slug}
        onChange={(url) => setField("imageUrl", url)}
      />

      <div>
        <label className={labelCls}>Short Description</label>
        <input className={inputCls} value={form.shortDescription} onChange={(e) => setField("shortDescription", e.target.value)} placeholder="One-line product summary" />
      </div>

      <div>
        <label className={labelCls}>Full Description</label>
        <textarea
          className={`${inputCls} resize-none`}
          rows={4}
          value={form.description}
          onChange={(e) => setField("description", e.target.value)}
          placeholder="Detailed product description..."
        />
      </div>

      {/* Specs editor */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className={labelCls + " mb-0"}>Technical Specifications</label>
          <button type="button" onClick={addSpec} className="flex items-center gap-1 font-mono text-xs text-primary hover:underline">
            <Plus className="w-3 h-3" /> Add spec
          </button>
        </div>
        <div className="space-y-2">
          {form.specs.map((spec, i) => (
            <div key={i} className="flex items-center gap-2">
              <input className={`${inputCls} flex-1`} value={spec.name} onChange={(e) => setSpec(i, "name", e.target.value)} placeholder="Spec name (e.g. VRAM)" />
              <input className={`${inputCls} flex-1`} value={spec.value} onChange={(e) => setSpec(i, "value", e.target.value)} placeholder="Value (e.g. 24 GB)" />
              <button type="button" onClick={() => removeSpec(i)} className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-heading font-bold uppercase text-sm rounded-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving..." : "Save Product"}
        </button>
        <button type="button" onClick={onCancel} className="px-5 py-3 border border-border font-mono text-sm text-muted-foreground hover:text-foreground rounded-sm transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

function PriceModal({ product, onClose, onSave }: { product: Product; onClose: () => void; onSave: (id: number, base: number, sale: number | null) => void }) {
  const [base, setBase] = useState(String(product.basePrice));
  const [sale, setSale] = useState(product.salePrice !== null ? String(product.salePrice) : "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/admin/products/${product.id}/price`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ basePrice: parseFloat(base), salePrice: sale ? parseFloat(sale) : null }),
      });
      if (res.ok) {
        onSave(product.id, parseFloat(base), sale ? parseFloat(sale) : null);
        onClose();
      }
    } finally { setSaving(false); }
  };

  const inputCls = "w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary transition-colors";

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(5,5,5,0.85)", backdropFilter: "blur(12px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: -16, scale: 0.97 }} animate={{ y: 0, scale: 1 }}
        className="w-full max-w-sm bg-card border border-border rounded-sm p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading font-bold uppercase">Edit Price</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
        <p className="font-mono text-xs text-muted-foreground mb-4 line-clamp-1">{product.name}</p>
        <div className="space-y-4">
          <div>
            <label className="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Base Price ($)</label>
            <input className={inputCls} type="number" step="0.01" min="0" value={base} onChange={(e) => setBase(e.target.value)} />
          </div>
          <div>
            <label className="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Sale Price ($) — leave empty to remove</label>
            <input className={inputCls} type="number" step="0.01" min="0" value={sale} onChange={(e) => setSale(e.target.value)} placeholder="No discount" />
          </div>
          {sale && parseFloat(base) > 0 && (
            <p className="font-mono text-xs text-primary">
              Discount: -{Math.round((1 - parseFloat(sale) / parseFloat(base)) * 100)}%
            </p>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-primary text-primary-foreground font-heading font-bold uppercase text-sm rounded-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Update Price"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Dashboard() {
  const { user } = useUserStore();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tab, setTab] = useState<"overview" | "products" | "branches" | "codes" | "stock">("overview");

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "add" | "edit">("list");
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [priceModal, setPriceModal] = useState<Product | null>(null);

  // Branches state
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchForm, setBranchForm] = useState({ name: "", location: "", contact: "" });
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [branchSaving, setBranchSaving] = useState(false);
  const [confirmDeleteBranch, setConfirmDeleteBranch] = useState<number | null>(null);

  // Access codes state
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [codeForm, setCodeForm] = useState({ type: "manager", branchId: "", label: "" });
  const [codeSaving, setCodeSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Branch stock state
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [branchProducts, setBranchProducts] = useState<Array<Product & { branchData: { available: boolean; stock: number | null; discount: string | null; featured: boolean; notes: string } | null }>>([]);
  const [branchStockLoading, setBranchStockLoading] = useState(false);
  const [savingCell, setSavingCell] = useState<string | null>(null);

  // Sales data state
  const [salesData, setSalesData] = useState<{
    daily: Array<{ date: string; orders: number; revenue: number }>;
    monthly: Array<{ month: string; orders: number; revenue: number }>;
  }>({ daily: [], monthly: [] });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/products`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      } else if (res.status === 403) {
        toast({ title: "Access denied", variant: "destructive" });
        navigate("/");
      }
    } catch {}
    setLoading(false);
  }, [navigate, toast]);

  const fetchBranches = useCallback(async () => {
    try {
      const res = await fetch(`${API}/branches`, { credentials: "include" });
      if (res.ok) setBranches(await res.json());
    } catch {}
  }, []);

  const fetchCodes = useCallback(async () => {
    try {
      const res = await fetch(`${API}/access-codes`, { credentials: "include" });
      if (res.ok) setCodes(await res.json());
    } catch {}
  }, []);

  const fetchBranchProducts = useCallback(async (branchId: string) => {
    if (!branchId) return;
    setBranchStockLoading(true);
    try {
      const res = await fetch(`${API}/branches/${branchId}/products`, { credentials: "include" });
      if (res.ok) setBranchProducts(await res.json());
    } catch {}
    setBranchStockLoading(false);
  }, []);

  const handleBranchProductField = async (productId: number, field: string, value: boolean | string | number | null) => {
    if (!selectedBranchId) return;
    const cellKey = `${productId}-${field}`;
    setSavingCell(cellKey);
    setBranchProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, branchData: { available: true, stock: null, discount: null, featured: false, notes: "", ...p.branchData, [field]: value } }
          : p
      )
    );
    try {
      const product = branchProducts.find((p) => p.id === productId);
      const current = product?.branchData || { available: true, stock: null, discount: null, featured: false, notes: "" };
      await fetch(`${API}/branches/${selectedBranchId}/products/${productId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...current, [field]: value }),
      });
    } catch {}
    setSavingCell(null);
  };

  const fetchSalesData = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin/sales`, { credentials: "include" });
      if (res.ok) setSalesData(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    if (!user) { navigate("/account"); return; }
    if (!isOwner(user)) { navigate("/"); return; }
    fetchProducts();
    fetchBranches();
    fetchCodes();
    fetchSalesData();
  }, [user, navigate, fetchProducts, fetchBranches, fetchCodes, fetchSalesData]);

  useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(String(branches[0].id));
    }
  }, [branches, selectedBranchId]);

  useEffect(() => {
    if (tab === "stock" && selectedBranchId) fetchBranchProducts(selectedBranchId);
  }, [tab, selectedBranchId, fetchBranchProducts]);

  const handleCreate = async (data: FormData) => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/admin/products`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          basePrice: parseFloat(data.basePrice),
          salePrice: data.salePrice ? parseFloat(data.salePrice) : null,
          stock: parseInt(data.stock),
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setProducts((prev) => [json.product, ...prev]);
        toast({ title: "Product published", description: `${json.product.name} is now live.` });
        setView("list");
      } else {
        toast({ title: "Error", description: json.error, variant: "destructive" });
      }
    } finally { setSaving(false); }
  };

  const handleUpdate = async (data: FormData) => {
    if (!editProduct) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/admin/products/${editProduct.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          basePrice: parseFloat(data.basePrice),
          salePrice: data.salePrice ? parseFloat(data.salePrice) : null,
          stock: parseInt(data.stock),
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setProducts((prev) => prev.map((p) => (p.id === editProduct.id ? json.product : p)));
        toast({ title: "Product updated" });
        setView("list");
        setEditProduct(null);
      } else {
        toast({ title: "Error", description: json.error, variant: "destructive" });
      }
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`${API}/admin/products/${id}`, { method: "DELETE", credentials: "include" });
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast({ title: "Product removed" });
    } catch {}
    setConfirmDelete(null);
  };

  const handlePriceUpdate = (id: number, base: number, sale: number | null) => {
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, basePrice: base, salePrice: sale } : p));
    toast({ title: "Price updated" });
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  // Branch handlers
  const handleBranchSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBranchSaving(true);
    try {
      const url = editBranch ? `${API}/branches/${editBranch.id}` : `${API}/branches`;
      const method = editBranch ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branchForm),
      });
      if (res.ok) {
        const branch = await res.json();
        if (editBranch) {
          setBranches((prev) => prev.map((b) => (b.id === branch.id ? branch : b)));
          toast({ title: "Branch updated" });
        } else {
          setBranches((prev) => [...prev, branch]);
          toast({ title: "Branch created" });
        }
        setBranchForm({ name: "", location: "", contact: "" });
        setEditBranch(null);
      } else {
        const j = await res.json();
        toast({ title: "Error", description: j.error, variant: "destructive" });
      }
    } finally { setBranchSaving(false); }
  };

  const handleBranchDelete = async (id: number) => {
    try {
      await fetch(`${API}/branches/${id}`, { method: "DELETE", credentials: "include" });
      setBranches((prev) => prev.filter((b) => b.id !== id));
      toast({ title: "Branch deleted" });
    } catch {}
    setConfirmDeleteBranch(null);
  };

  // Access code handlers
  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeSaving(true);
    try {
      const res = await fetch(`${API}/access-codes`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: codeForm.type,
          branchId: codeForm.branchId ? parseInt(codeForm.branchId) : null,
          label: codeForm.label,
        }),
      });
      if (res.ok) {
        const code = await res.json();
        setCodes((prev) => [code, ...prev]);
        toast({ title: "Access code generated", description: code.code });
        setCodeForm({ type: "manager", branchId: "", label: "" });
      } else {
        const j = await res.json();
        toast({ title: "Error", description: j.error, variant: "destructive" });
      }
    } finally { setCodeSaving(false); }
  };

  const handleToggleCode = async (id: number) => {
    try {
      const res = await fetch(`${API}/access-codes/${id}/toggle`, { method: "PUT", credentials: "include" });
      if (res.ok) {
        const updated = await res.json();
        setCodes((prev) => prev.map((c) => (c.id === id ? updated : c)));
      }
    } catch {}
  };

  const handleDeleteCode = async (id: number) => {
    try {
      await fetch(`${API}/access-codes/${id}`, { method: "DELETE", credentials: "include" });
      setCodes((prev) => prev.filter((c) => c.id !== id));
      toast({ title: "Access code deleted" });
    } catch {}
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (!user || !isOwner(user)) {
    return (
      <Layout>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
          <Lock className="w-12 h-12 text-muted-foreground" />
          <p className="font-heading font-bold text-xl uppercase">Owner Access Required</p>
        </div>
      </Layout>
    );
  }

  const inputCls = "w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary transition-colors";
  const labelCls = "block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-1.5";

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-2 font-mono text-xs text-primary uppercase tracking-widest mb-3">
            <Layers className="w-3.5 h-3.5" /> Owner Panel
          </div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-4xl md:text-5xl font-heading font-black uppercase tracking-tight">DASHBOARD</h1>
              <p className="text-muted-foreground font-mono mt-1">
                {products.length} products · {branches.length} branches · Owner: <span className="text-primary">{user.username}</span>
              </p>
            </div>
            {tab === "products" && view === "list" && (
              <button
                onClick={() => setView("add")}
                className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground font-heading font-bold uppercase text-sm rounded-sm hover:bg-primary/90 transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" /> Add Product
              </button>
            )}
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-0 mb-8 border-b border-border overflow-x-auto">
          {([
            { id: "overview", label: "Overview", icon: BarChart3 },
            { id: "products", label: "Products", icon: Package },
            { id: "branches", label: "Branches", icon: Building2 },
            { id: "codes", label: "Access Codes", icon: Key },
            { id: "stock", label: "Branch Stock", icon: SlidersHorizontal },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-5 py-3 font-mono text-sm uppercase tracking-wide transition-all border-b-2 -mb-px whitespace-nowrap ${tab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* ===================== PRODUCTS TAB ===================== */}
        {tab === "products" && (
          <>
            {/* Stats */}
            {view === "list" && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label: "Total Products", value: products.length, icon: Package },
                  { label: "On Sale", value: products.filter((p) => p.salePrice).length, icon: Tag },
                  { label: "In Stock", value: products.filter((p) => p.stock > 0).length, icon: Check },
                  { label: "Out of Stock", value: products.filter((p) => p.stock === 0).length, icon: AlertTriangle },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-sm p-4">
                      <Icon className="w-4 h-4 text-muted-foreground mb-2" />
                      <p className="font-mono text-2xl font-bold">{stat.value}</p>
                      <p className="font-mono text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                    </motion.div>
                  );
                })}
              </div>
            )}

            <AnimatePresence mode="wait">
              {view === "add" && (
                <motion.div key="add" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-card border border-border rounded-sm p-6 mb-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-heading font-bold text-xl uppercase flex items-center gap-2"><Plus className="w-5 h-5 text-primary" /> New Product</h2>
                    <button onClick={() => setView("list")} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
                  </div>
                  <ProductForm onSave={handleCreate} onCancel={() => setView("list")} saving={saving} />
                </motion.div>
              )}
              {view === "edit" && editProduct && (
                <motion.div key="edit" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-card border border-border rounded-sm p-6 mb-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-heading font-bold text-xl uppercase flex items-center gap-2"><Pencil className="w-5 h-5 text-primary" /> Edit Product</h2>
                    <button onClick={() => { setView("list"); setEditProduct(null); }} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
                  </div>
                  <ProductForm
                    initial={{ ...editProduct, basePrice: String(editProduct.basePrice), salePrice: editProduct.salePrice !== null ? String(editProduct.salePrice) : "", stock: String(editProduct.stock) } as FormData}
                    onSave={handleUpdate}
                    onCancel={() => { setView("list"); setEditProduct(null); }}
                    saving={saving}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {view === "list" && (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-sm font-mono text-sm focus:outline-none focus:border-primary transition-colors" />
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
                </div>
                {loading ? (
                  <div className="space-y-2">{Array(5).fill(0).map((_, i) => <div key={i} className="h-16 bg-card border border-border rounded-sm animate-pulse" />)}</div>
                ) : (
                  <div className="border border-border rounded-sm overflow-hidden">
                    <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-0 bg-muted/20 px-4 py-2.5 border-b border-border">
                      {["Image", "Product", "Price", "Stock", "Category", "Actions"].map((h) => (
                        <span key={h} className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{h}</span>
                      ))}
                    </div>
                    <div className="divide-y divide-border">
                      <AnimatePresence initial={false}>
                        {filtered.map((p, i) => {
                          const imageUrl = p.imageUrl || `https://picsum.photos/seed/${p.slug}/80/80`;
                          return (
                            <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} transition={{ delay: i * 0.02 }} className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 px-4 py-3 hover:bg-muted/10 transition-colors">
                              <img src={imageUrl} alt={p.name} className="w-10 h-10 object-cover rounded-sm bg-muted shrink-0" />
                              <div className="min-w-0">
                                <p className="font-heading font-bold text-sm truncate">{p.name}</p>
                                <p className="font-mono text-xs text-muted-foreground truncate">{p.sku}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className={`font-mono text-sm font-bold ${p.salePrice ? "text-primary" : ""}`}>${(p.salePrice ?? p.basePrice).toLocaleString()}</p>
                                {p.salePrice && <p className="font-mono text-xs text-muted-foreground line-through">${p.basePrice.toLocaleString()}</p>}
                              </div>
                              <div className="shrink-0">
                                <span className={`font-mono text-xs px-2 py-1 rounded-sm ${p.stock === 0 ? "bg-destructive/20 text-destructive" : p.stock <= 5 ? "bg-orange-400/20 text-orange-400" : "bg-green-500/20 text-green-400"}`}>
                                  {p.stock === 0 ? "OUT" : `${p.stock} left`}
                                </span>
                              </div>
                              <span className="font-mono text-xs text-muted-foreground shrink-0">{p.category}</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button onClick={() => setPriceModal(p)} title="Edit price" className="p-1.5 text-muted-foreground hover:text-primary border border-transparent hover:border-primary/30 rounded-sm transition-all"><DollarSign className="w-3.5 h-3.5" /></button>
                                <button onClick={() => { setEditProduct(p); setView("edit"); }} title="Edit product" className="p-1.5 text-muted-foreground hover:text-primary border border-transparent hover:border-primary/30 rounded-sm transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                                {confirmDelete === p.id ? (
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => handleDelete(p.id)} className="p-1.5 text-destructive border border-destructive/30 rounded-sm hover:bg-destructive/10 transition-colors"><Check className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => setConfirmDelete(null)} className="p-1.5 text-muted-foreground border border-border rounded-sm hover:bg-muted/30 transition-colors"><X className="w-3.5 h-3.5" /></button>
                                  </div>
                                ) : (
                                  <button onClick={() => setConfirmDelete(p.id)} title="Delete product" className="p-1.5 text-muted-foreground hover:text-destructive border border-transparent hover:border-destructive/30 rounded-sm transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                      {filtered.length === 0 && <div className="py-12 text-center font-mono text-sm text-muted-foreground">No products found</div>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ===================== BRANCHES TAB ===================== */}
        {tab === "branches" && (
          <div className="space-y-6">
            {/* Create/Edit Branch form */}
            <div className="bg-card border border-border rounded-sm p-6">
              <h2 className="font-heading font-bold text-lg uppercase mb-5 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" /> {editBranch ? "Edit Branch" : "Add New Branch"}
              </h2>
              <form onSubmit={handleBranchSave} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Branch Name *</label>
                  <input className={inputCls} value={branchForm.name} onChange={(e) => setBranchForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Downtown Hub" required />
                </div>
                <div>
                  <label className={labelCls}>Location</label>
                  <input className={inputCls} value={branchForm.location} onChange={(e) => setBranchForm((f) => ({ ...f, location: e.target.value }))} placeholder="City, State" />
                </div>
                <div>
                  <label className={labelCls}>Contact</label>
                  <input className={inputCls} value={branchForm.contact} onChange={(e) => setBranchForm((f) => ({ ...f, contact: e.target.value }))} placeholder="Email or phone" />
                </div>
                <div className="md:col-span-3 flex gap-3">
                  <button type="submit" disabled={branchSaving} className="px-6 py-2.5 bg-primary text-primary-foreground font-heading font-bold uppercase text-sm rounded-sm hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2">
                    {branchSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                    {editBranch ? "Save Changes" : "Create Branch"}
                  </button>
                  {editBranch && (
                    <button type="button" onClick={() => { setEditBranch(null); setBranchForm({ name: "", location: "", contact: "" }); }} className="px-5 py-2.5 border border-border font-mono text-sm rounded-sm hover:bg-muted/20 transition-colors">Cancel</button>
                  )}
                </div>
              </form>
            </div>

            {/* Branches list */}
            <div className="space-y-3">
              {branches.length === 0 ? (
                <div className="py-12 text-center font-mono text-sm text-muted-foreground border border-dashed border-border rounded-sm">No branches yet. Create your first branch above.</div>
              ) : (
                branches.map((branch) => (
                  <motion.div key={branch.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-sm p-5 flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-4">
                      <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${branch.active ? "bg-green-400" : "bg-muted-foreground"}`} />
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-heading font-bold text-lg uppercase">{branch.name}</h3>
                          <span className={`font-mono text-[10px] uppercase px-2 py-0.5 rounded-sm border ${branch.active ? "border-green-400/40 bg-green-400/10 text-green-400" : "border-border text-muted-foreground"}`}>{branch.active ? "Active" : "Inactive"}</span>
                        </div>
                        <div className="flex items-center gap-4 flex-wrap">
                          {branch.location && <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground"><MapPin className="w-3 h-3" />{branch.location}</span>}
                          {branch.contact && <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground"><Phone className="w-3 h-3" />{branch.contact}</span>}
                          {branch.managerId && <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground"><User className="w-3 h-3" />Manager #{branch.managerId}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditBranch(branch); setBranchForm({ name: branch.name, location: branch.location, contact: branch.contact }); }} className="p-2 text-muted-foreground hover:text-primary border border-transparent hover:border-primary/30 rounded-sm transition-all"><Pencil className="w-4 h-4" /></button>
                      {confirmDeleteBranch === branch.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => handleBranchDelete(branch.id)} className="p-2 text-destructive border border-destructive/30 rounded-sm hover:bg-destructive/10 transition-colors"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setConfirmDeleteBranch(null)} className="p-2 text-muted-foreground border border-border rounded-sm"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteBranch(branch.id)} className="p-2 text-muted-foreground hover:text-destructive border border-transparent hover:border-destructive/30 rounded-sm transition-all"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ===================== ACCESS CODES TAB ===================== */}
        {tab === "codes" && (
          <div className="space-y-6">
            {/* Generate code form */}
            <div className="bg-card border border-border rounded-sm p-6">
              <h2 className="font-heading font-bold text-lg uppercase mb-5 flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" /> Generate Access Code
              </h2>
              <form onSubmit={handleCreateCode} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Role Type *</label>
                  <select className={inputCls} value={codeForm.type} onChange={(e) => setCodeForm((f) => ({ ...f, type: e.target.value }))}>
                    <option value="owner">Owner</option>
                    <option value="manager">Manager</option>
                    <option value="employee">Employee</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Branch <span className="normal-case tracking-normal text-muted-foreground/60">(managers only)</span></label>
                  <select className={inputCls} value={codeForm.branchId} onChange={(e) => setCodeForm((f) => ({ ...f, branchId: e.target.value }))}>
                    <option value="">No branch</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Label <span className="normal-case tracking-normal text-muted-foreground/60">optional</span></label>
                  <input className={inputCls} value={codeForm.label} onChange={(e) => setCodeForm((f) => ({ ...f, label: e.target.value }))} placeholder="e.g. Sarah – Downtown Manager" />
                </div>
                <div className="md:col-span-3">
                  <button type="submit" disabled={codeSaving} className="px-6 py-2.5 bg-primary text-primary-foreground font-heading font-bold uppercase text-sm rounded-sm hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2">
                    {codeSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Key className="w-4 h-4" />}
                    Generate Code
                  </button>
                </div>
              </form>
            </div>

            {/* Codes list */}
            <div className="border border-border rounded-sm overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-0 bg-muted/20 px-4 py-2.5 border-b border-border">
                {["Code / Label", "Type", "Branch", "Status", "Actions"].map((h) => (
                  <span key={h} className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{h}</span>
                ))}
              </div>
              <div className="divide-y divide-border">
                {codes.length === 0 ? (
                  <div className="py-12 text-center font-mono text-sm text-muted-foreground">No access codes yet. Generate one above.</div>
                ) : (
                  codes.map((code) => {
                    const branch = branches.find((b) => b.id === code.branchId);
                    return (
                      <motion.div key={code.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-4 py-3 hover:bg-muted/10 transition-colors">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <code className={`font-mono text-sm font-bold tracking-widest ${code.active ? "text-primary" : "text-muted-foreground line-through"}`}>{code.code}</code>
                            <button onClick={() => copyToClipboard(code.code)} className="text-muted-foreground hover:text-primary transition-colors">
                              {copiedCode === code.code ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          {code.label && <p className="font-mono text-xs text-muted-foreground mt-0.5">{code.label}</p>}
                          {code.usedBy && <p className="font-mono text-[10px] text-muted-foreground/60">Used by user #{code.usedBy}</p>}
                        </div>
                        <span className={`font-mono text-xs px-2 py-1 rounded-sm ${code.type === "owner" ? "bg-yellow-400/20 text-yellow-400" : code.type === "manager" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                          {code.type}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">{branch?.name || "—"}</span>
                        <span className={`font-mono text-xs px-2 py-1 rounded-sm ${code.active ? "bg-green-400/20 text-green-400" : "bg-muted text-muted-foreground"}`}>
                          {code.active ? "Active" : "Disabled"}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleToggleCode(code.id)} title={code.active ? "Disable" : "Enable"} className="p-1.5 text-muted-foreground hover:text-primary border border-transparent hover:border-primary/30 rounded-sm transition-all">
                            {code.active ? <ToggleRight className="w-4 h-4 text-primary" /> : <ToggleLeft className="w-4 h-4" />}
                          </button>
                          <button onClick={() => handleDeleteCode(code.id)} className="p-1.5 text-muted-foreground hover:text-destructive border border-transparent hover:border-destructive/30 rounded-sm transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================== OVERVIEW TAB ===================== */}
        {tab === "overview" && (
          <div className="space-y-8">
            {/* Key metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: "Total Products",
                  value: products.length,
                  sub: `${products.filter((p) => p.salePrice).length} on sale`,
                  icon: Package,
                  color: "text-primary",
                  bg: "bg-primary/10",
                },
                {
                  label: "Inventory Value",
                  value: `$${products.reduce((sum, p) => sum + (p.salePrice ?? p.basePrice) * p.stock, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                  sub: `${products.reduce((sum, p) => sum + p.stock, 0).toLocaleString()} units total`,
                  icon: DollarSign,
                  color: "text-green-400",
                  bg: "bg-green-400/10",
                },
                {
                  label: "Active Branches",
                  value: branches.filter((b) => b.active).length,
                  sub: `${branches.length} total`,
                  icon: Building2,
                  color: "text-blue-400",
                  bg: "bg-blue-400/10",
                },
                {
                  label: "Access Codes",
                  value: codes.filter((c) => c.active).length,
                  sub: `${codes.length} total issued`,
                  icon: Key,
                  color: "text-yellow-400",
                  bg: "bg-yellow-400/10",
                },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card border border-border rounded-sm p-5"
                  >
                    <div className={`w-8 h-8 rounded-sm ${stat.bg} flex items-center justify-center mb-3`}>
                      <Icon className={`w-4 h-4 ${stat.color}`} />
                    </div>
                    <p className={`font-mono text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="font-heading font-bold text-sm uppercase mt-1">{stat.label}</p>
                    <p className="font-mono text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
                  </motion.div>
                );
              })}
            </div>

            {/* Sales Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Monthly Revenue */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card border border-border rounded-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <h3 className="font-heading font-bold uppercase text-sm">Monthly Revenue</h3>
                  </div>
                  {salesData.monthly.length > 0 && (
                    <span className="font-mono text-xs text-muted-foreground">
                      ${salesData.monthly.reduce((s, r) => s + r.revenue, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} total
                    </span>
                  )}
                </div>
                {salesData.monthly.length === 0 ? (
                  <div className="h-44 flex items-center justify-center font-mono text-xs text-muted-foreground">Loading...</div>
                ) : (
                  <ResponsiveContainer width="100%" height={176}>
                    <AreaChart data={salesData.monthly} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="monthlyGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#00F0FF" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                      <XAxis
                        dataKey="month"
                        tick={{ fill: "#6b7280", fontSize: 10, fontFamily: "monospace" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: string) => {
                          const [, m] = v.split("-");
                          return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(m) - 1] || v;
                        }}
                      />
                      <YAxis
                        tick={{ fill: "#6b7280", fontSize: 10, fontFamily: "monospace" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                      />
                      <Tooltip
                        contentStyle={{ background: "#09090B", border: "1px solid #27272a", borderRadius: "2px", fontFamily: "monospace", fontSize: "12px" }}
                        labelStyle={{ color: "#00F0FF", marginBottom: 4 }}
                        itemStyle={{ color: "#a1a1aa" }}
                        formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]}
                        labelFormatter={(v: string) => {
                          const [yr, m] = v.split("-");
                          const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                          return `${months[parseInt(m) - 1]} ${yr}`;
                        }}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#00F0FF" strokeWidth={2} fill="url(#monthlyGrad)" dot={false} activeDot={{ r: 4, fill: "#00F0FF", strokeWidth: 0 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </motion.div>

              {/* Daily Orders */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="bg-card border border-border rounded-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    <h3 className="font-heading font-bold uppercase text-sm">Daily Sales — Last 30 Days</h3>
                  </div>
                  {salesData.daily.length > 0 && (
                    <span className="font-mono text-xs text-muted-foreground">
                      {salesData.daily.reduce((s, r) => s + r.orders, 0)} orders
                    </span>
                  )}
                </div>
                {salesData.daily.length === 0 ? (
                  <div className="h-44 flex items-center justify-center font-mono text-xs text-muted-foreground">Loading...</div>
                ) : (
                  <ResponsiveContainer width="100%" height={176}>
                    <BarChart data={salesData.daily} margin={{ top: 4, right: 0, left: -20, bottom: 0 }} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#6b7280", fontSize: 10, fontFamily: "monospace" }}
                        axisLine={false}
                        tickLine={false}
                        interval={6}
                        tickFormatter={(v: string) => {
                          const d = new Date(v + "T00:00:00");
                          return `${d.getMonth() + 1}/${d.getDate()}`;
                        }}
                      />
                      <YAxis
                        tick={{ fill: "#6b7280", fontSize: 10, fontFamily: "monospace" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                      />
                      <Tooltip
                        contentStyle={{ background: "#09090B", border: "1px solid #27272a", borderRadius: "2px", fontFamily: "monospace", fontSize: "12px" }}
                        labelStyle={{ color: "#00F0FF", marginBottom: 4 }}
                        itemStyle={{ color: "#a1a1aa" }}
                        formatter={(v: number, name: string) => [name === "revenue" ? `$${v.toLocaleString()}` : v, name === "revenue" ? "Revenue" : "Orders"]}
                        labelFormatter={(v: string) => {
                          const d = new Date(v + "T00:00:00");
                          return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                        }}
                      />
                      <Bar dataKey="revenue" fill="#00F0FF" fillOpacity={0.8} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </motion.div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category breakdown */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-sm p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Boxes className="w-4 h-4 text-primary" />
                  <h3 className="font-heading font-bold uppercase text-sm">Category Breakdown</h3>
                </div>
                <div className="space-y-3">
                  {CATEGORIES.map((cat) => {
                    const catProducts = products.filter((p) => p.categorySlug === cat.slug);
                    const catValue = catProducts.reduce((sum, p) => sum + (p.salePrice ?? p.basePrice), 0);
                    const pct = products.length > 0 ? Math.round((catProducts.length / products.length) * 100) : 0;
                    return (
                      <div key={cat.slug}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-xs text-muted-foreground uppercase tracking-wide">{cat.label}</span>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs text-muted-foreground">${catValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            <span className="font-mono text-xs font-bold text-foreground w-6 text-right">{catProducts.length}</span>
                          </div>
                        </div>
                        <div className="h-1 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
                            className="h-full bg-primary rounded-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Low stock alerts */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card border border-border rounded-sm p-6">
                <div className="flex items-center gap-2 mb-5">
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                  <h3 className="font-heading font-bold uppercase text-sm">Stock Alerts</h3>
                  {products.filter((p) => p.stock <= 5).length > 0 && (
                    <span className="ml-auto font-mono text-[10px] px-2 py-0.5 bg-orange-400/15 text-orange-400 border border-orange-400/30 rounded-sm">
                      {products.filter((p) => p.stock <= 5).length} items
                    </span>
                  )}
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {products.filter((p) => p.stock <= 5).length === 0 ? (
                    <div className="py-8 text-center">
                      <Check className="w-8 h-8 text-green-400 mx-auto mb-2" />
                      <p className="font-mono text-xs text-muted-foreground">All products well stocked</p>
                    </div>
                  ) : (
                    products
                      .filter((p) => p.stock <= 5)
                      .sort((a, b) => a.stock - b.stock)
                      .map((p) => (
                        <div key={p.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                          <img src={p.imageUrl || `https://picsum.photos/seed/${p.slug}/40/40`} alt={p.name} className="w-8 h-8 object-cover rounded-sm bg-muted shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-mono text-xs truncate">{p.name}</p>
                            <p className="font-mono text-[10px] text-muted-foreground">{p.sku}</p>
                          </div>
                          <span className={`font-mono text-xs font-bold px-2 py-1 rounded-sm shrink-0 ${p.stock === 0 ? "bg-destructive/20 text-destructive" : "bg-orange-400/15 text-orange-400"}`}>
                            {p.stock === 0 ? "OUT" : `${p.stock} left`}
                          </span>
                        </div>
                      ))
                  )}
                </div>
              </motion.div>
            </div>

            {/* Branches summary */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-border rounded-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <Activity className="w-4 h-4 text-primary" />
                <h3 className="font-heading font-bold uppercase text-sm">Branch Activity</h3>
                <span className="ml-auto font-mono text-xs text-muted-foreground">{branches.length} branches registered</span>
              </div>
              {branches.length === 0 ? (
                <p className="font-mono text-sm text-muted-foreground text-center py-6">No branches created yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {branches.map((b) => (
                    <div key={b.id} className="border border-border rounded-sm p-4 flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${b.active ? "bg-green-400" : "bg-muted-foreground"}`} />
                      <div className="min-w-0">
                        <p className="font-heading font-bold text-sm uppercase truncate">{b.name}</p>
                        {b.location && <p className="font-mono text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3 shrink-0" />{b.location}</p>}
                        <p className={`font-mono text-[10px] mt-1 ${b.active ? "text-green-400" : "text-muted-foreground"}`}>{b.active ? "● Active" : "○ Inactive"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Recent codes */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-card border border-border rounded-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h3 className="font-heading font-bold uppercase text-sm">Recent Access Codes</h3>
                <span className="ml-auto font-mono text-xs text-muted-foreground">{codes.filter((c) => c.active).length} active</span>
              </div>
              {codes.length === 0 ? (
                <p className="font-mono text-sm text-muted-foreground text-center py-6">No access codes generated yet.</p>
              ) : (
                <div className="space-y-2">
                  {codes.slice(0, 5).map((c) => (
                    <div key={c.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                      <span className={`font-mono text-xs font-bold tracking-wider ${c.active ? "text-primary" : "text-muted-foreground line-through"}`}>{c.code}</span>
                      <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-sm ml-auto ${c.type === "owner" ? "bg-yellow-400/20 text-yellow-400" : c.type === "manager" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>{c.type}</span>
                      {c.label && <span className="font-mono text-[10px] text-muted-foreground hidden sm:block truncate max-w-[120px]">{c.label}</span>}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* ===================== BRANCH STOCK TAB ===================== */}
        {tab === "stock" && (
          <div className="space-y-6">
            {/* Branch selector header */}
            <div className="flex items-center gap-4 flex-wrap">
              <h2 className="font-heading font-bold text-xl uppercase flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-primary" /> Branch Stock Management
              </h2>
              {branches.length > 0 ? (
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="bg-card border border-border rounded-sm px-4 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-primary transition-colors cursor-pointer"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={String(b.id)}>{b.name}</option>
                  ))}
                </select>
              ) : (
                <span className="font-mono text-sm text-muted-foreground">No branches yet — create one in the Branches tab.</span>
              )}
            </div>

            {/* Table */}
            {branches.length > 0 && (
              <div className="border border-border rounded-sm overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[2fr_80px_80px_90px_80px_1fr] gap-0 bg-muted/30 px-4 py-2.5 border-b border-border">
                  {["Product", "Available", "Stock", "Discount %", "Featured", "Notes"].map((h) => (
                    <span key={h} className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{h}</span>
                  ))}
                </div>

                {/* Table body */}
                {branchStockLoading ? (
                  <div className="space-y-0">
                    {Array(8).fill(0).map((_, i) => (
                      <div key={i} className="h-14 border-b border-border animate-pulse bg-card/50 last:border-0" />
                    ))}
                  </div>
                ) : branchProducts.length === 0 ? (
                  <div className="py-16 text-center font-mono text-sm text-muted-foreground">No products found.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {branchProducts.map((p) => {
                      const bd = p.branchData;
                      const available = bd?.available ?? true;
                      const featured = bd?.featured ?? false;
                      const stock = bd?.stock ?? p.stock;
                      const discount = bd?.discount ?? "0";
                      const notes = bd?.notes ?? "";

                      return (
                        <div key={p.id} className="grid grid-cols-[2fr_80px_80px_90px_80px_1fr] items-center gap-3 px-4 py-3 hover:bg-muted/10 transition-colors">
                          {/* Product */}
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={p.imageUrl || `https://picsum.photos/seed/${p.slug}/40/40`}
                              alt={p.name}
                              className="w-8 h-8 object-cover rounded-sm bg-muted shrink-0"
                            />
                            <span className="font-heading font-bold text-sm truncate">{p.name}</span>
                          </div>

                          {/* Available toggle */}
                          <button
                            onClick={() => handleBranchProductField(p.id, "available", !available)}
                            className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${available ? "bg-primary" : "bg-border"}`}
                          >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${available ? "translate-x-5" : "translate-x-0"}`} />
                          </button>

                          {/* Stock input */}
                          <input
                            type="number"
                            min="0"
                            defaultValue={String(stock)}
                            key={`stock-${p.id}-${selectedBranchId}`}
                            onBlur={(e) => handleBranchProductField(p.id, "stock", parseInt(e.target.value) || 0)}
                            className={`w-full bg-background border rounded-sm px-2 py-1.5 font-mono text-sm text-center focus:outline-none focus:border-primary transition-colors ${savingCell === `${p.id}-stock` ? "border-primary/50 animate-pulse" : "border-border"}`}
                          />

                          {/* Discount input */}
                          <input
                            type="number"
                            min="0"
                            max="100"
                            defaultValue={String(parseFloat(discount || "0"))}
                            key={`disc-${p.id}-${selectedBranchId}`}
                            onBlur={(e) => handleBranchProductField(p.id, "discount", e.target.value)}
                            className={`w-full bg-background border rounded-sm px-2 py-1.5 font-mono text-sm text-center focus:outline-none focus:border-primary transition-colors ${savingCell === `${p.id}-discount` ? "border-primary/50 animate-pulse" : "border-border"}`}
                          />

                          {/* Featured toggle */}
                          <button
                            onClick={() => handleBranchProductField(p.id, "featured", !featured)}
                            className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${featured ? "bg-primary" : "bg-border"}`}
                          >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${featured ? "translate-x-5" : "translate-x-0"}`} />
                          </button>

                          {/* Notes input */}
                          <input
                            type="text"
                            defaultValue={notes}
                            key={`notes-${p.id}-${selectedBranchId}`}
                            placeholder="Notes..."
                            onBlur={(e) => handleBranchProductField(p.id, "notes", e.target.value)}
                            className="w-full bg-background border border-border rounded-sm px-2.5 py-1.5 font-mono text-xs text-muted-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary transition-colors"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Price modal */}
      <AnimatePresence>
        {priceModal && (
          <PriceModal product={priceModal} onClose={() => setPriceModal(null)} onSave={handlePriceUpdate} />
        )}
      </AnimatePresence>
    </Layout>
  );
}
