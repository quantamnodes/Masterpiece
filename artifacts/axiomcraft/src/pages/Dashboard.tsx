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
  Upload, Loader2, Mail, MessageSquare, Inbox, Eye, EyeOff,
  BookType, ShoppingBag, Gamepad2, ShieldCheck,
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

const CATEGORIES: { slug: string; label: string }[] = [
  { slug: "gpus",         label: "GPUs" },
  { slug: "cpus",         label: "CPUs" },
  { slug: "motherboards", label: "Motherboards" },
  { slug: "memory",       label: "Memory" },
  { slug: "storage",      label: "Storage" },
  { slug: "psus",         label: "PSUs" },
  { slug: "cooling",      label: "Cooling" },
  { slug: "cases",        label: "Cases" },
  { slug: "peripherals",  label: "Peripherals" },
];

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

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  count?: number;
}

const EMPTY_FORM = {
  name: "", slug: "", categorySlug: "gpus", category: "Graphics Cards",
  shortDescription: "", description: "", basePrice: "", salePrice: "",
  stock: "0", sku: "", imageUrl: "", badge: "",
  specs: [{ name: "", value: "" }],
  performanceNotes: [] as Array<{ label: string; value: string }>,
};

type FormData = typeof EMPTY_FORM & {
  specs: Array<{ name: string; value: string }>;
  performanceNotes: Array<{ label: string; value: string }>;
};

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
  availableCategories,
}: {
  initial?: Partial<FormData>;
  onSave: (data: FormData) => void;
  onCancel: () => void;
  saving: boolean;
  availableCategories: Category[];
}) {
  const [form, setForm] = useState<FormData>({
    ...EMPTY_FORM,
    ...(initial || {}),
    specs: initial?.specs?.length ? initial.specs : [{ name: "", value: "" }],
    performanceNotes: (initial as any)?.performanceNotes || [],
    basePrice: initial?.basePrice !== undefined ? String(initial.basePrice) : "",
    salePrice: initial?.salePrice !== undefined && initial.salePrice !== null ? String(initial.salePrice) : "",
    stock: initial?.stock !== undefined ? String(initial.stock) : "0",
  });

  const setField = (k: keyof FormData, v: string) =>
    setForm((f) => {
      if (k === "categorySlug") {
        const cat = availableCategories.find((c) => c.slug === v);
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

  const setNote = (i: number, field: "label" | "value", v: string) =>
    setForm((f) => {
      const notes = [...f.performanceNotes];
      notes[i] = { ...notes[i], [field]: v };
      return { ...f, performanceNotes: notes };
    });
  const addNote = () => setForm((f) => ({ ...f, performanceNotes: [...f.performanceNotes, { label: "", value: "" }] }));
  const removeNote = (i: number) => setForm((f) => ({ ...f, performanceNotes: f.performanceNotes.filter((_, idx) => idx !== i) }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...form,
      specs: form.specs.filter((s) => s.name && s.value),
      performanceNotes: form.performanceNotes.filter((n) => n.label && n.value),
    });
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
            {availableCategories.length === 0 && (
              <option value="">Loading categories…</option>
            )}
            {availableCategories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
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

      {/* Performance Notes editor */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className={labelCls + " mb-0 flex items-center gap-1.5"}>
            <TrendingUp className="w-3.5 h-3.5 text-primary" /> Performance Impact Notes
          </label>
          <button type="button" onClick={addNote} className="flex items-center gap-1 font-mono text-xs text-primary hover:underline">
            <Plus className="w-3 h-3" /> Add note
          </button>
        </div>
        {form.performanceNotes.length === 0 && (
          <p className="font-mono text-xs text-muted-foreground">No notes yet. Add benchmark results and impact metrics here.</p>
        )}
        <div className="space-y-2">
          {form.performanceNotes.map((note, i) => (
            <div key={i} className="flex items-center gap-2">
              <input className={`${inputCls} flex-1`} value={note.label} onChange={(e) => setNote(i, "label", e.target.value)} placeholder="Label (e.g. 4K Gaming FPS Boost)" />
              <input className={`${inputCls} flex-1`} value={note.value} onChange={(e) => setNote(i, "value", e.target.value)} placeholder="Value (e.g. +40% over RTX 4090)" />
              <button type="button" onClick={() => removeNote(i)} className="p-2 text-muted-foreground hover:text-destructive transition-colors">
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
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-background/[0.85] backdrop-blur-xl"
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

  const [tab, setTab] = useState<"overview" | "products" | "branches" | "codes" | "stock" | "categories" | "contact" | "benefits" | "slang" | "bundles" | "compat" | "cod">("overview");

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

  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  const [catForm, setCatForm] = useState({ name: "", slug: "", description: "" });
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [catSaving, setCatSaving] = useState(false);
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<number | null>(null);
  const [catAutoSlug, setCatAutoSlug] = useState(true);

  // Contact settings state
  const [contactForm, setContactForm] = useState({
    email: "", emailSub: "", phone: "", phoneSub: "", address: "", addressSub: "",
    smtpHost: "", smtpPort: "587", smtpUser: "", smtpPass: "", smtpFrom: "", directLineEmail: "",
  });
  const [contactLoading, setContactLoading] = useState(false);
  const [contactSaving, setContactSaving] = useState(false);
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [contactMessages, setContactMessages] = useState<Array<{
    id: number; name: string; email: string; reason: string; message: string; createdAt: string;
  }>>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [expandedMessage, setExpandedMessage] = useState<number | null>(null);

  // Customer benefits state
  const [benefitsLoading, setBenefitsLoading] = useState(false);
  const [benefitsSaving, setBenefitsSaving] = useState(false);
  const [benefitsForm, setBenefitsForm] = useState({
    tierBenefitsVisible: true,
    bronzeDiscount: 0,
    silverDiscount: 3,
    goldDiscount: 7,
    platinumDiscount: 15,
    bronzeNext: 500,
    silverNext: 2000,
    goldNext: 10000,
  });

  // Slang tab state
  interface SlangTerm { id: number; term: string; mapsTo: string; active: boolean; }
  const [slangTerms, setSlangTerms] = useState<SlangTerm[]>([]);
  const [slangLoading, setSlangLoading] = useState(false);
  const [slangForm, setSlangForm] = useState({ term: "", mapsTo: "" });
  const [slangSaving, setSlangSaving] = useState(false);

  // Bundles tab state
  interface BundleItem { productId: number; quantity: number; }
  interface Bundle { id: number; slug: string; name: string; description: string; active: boolean; discountPct: number; badgeText: string; imageUrl: string; items: BundleItem[]; }
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [bundlesLoading, setBundlesLoading] = useState(false);
  const [bundleForm, setBundleForm] = useState({ slug: "", name: "", description: "", discountPct: "0", badgeText: "", imageUrl: "", items: [{ productId: "", quantity: "1" }] });
  const [bundleFormMode, setBundleFormMode] = useState<"none" | "add">("none");
  const [bundleSaving, setBundleSaving] = useState(false);

  // Compat Games tab state
  interface CompatGame { id: number; slug: string; name: string; categorySlug: string; specField: string; minSpec: string; recSpec: string; imageUrl: string; active: boolean; }
  const [compatGames, setCompatGames] = useState<CompatGame[]>([]);
  const [compatLoading, setCompatLoading] = useState(false);
  const [compatForm, setCompatForm] = useState({ slug: "", name: "", categorySlug: "gpus", specField: "", minSpec: "", recSpec: "", imageUrl: "" });
  const [compatFormMode, setCompatFormMode] = useState<"none" | "add">("none");
  const [compatSaving, setCompatSaving] = useState(false);

  // CoD Escrow tab state
  const [codSettings, setCodSettings] = useState({ enabled: false, highValueThreshold: 2000, commitmentFeePct: 10 });
  const [codLoading, setCodLoading] = useState(false);
  const [codSaving, setCodSaving] = useState(false);

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

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`${API}/categories`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!user) { navigate("/account"); return; }
    if (!isOwner(user)) { navigate("/"); return; }
    fetchProducts();
    fetchBranches();
    fetchCodes();
    fetchSalesData();
    fetchCategories();
  }, [user, navigate, fetchProducts, fetchBranches, fetchCodes, fetchSalesData, fetchCategories]);

  useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(String(branches[0].id));
    }
  }, [branches, selectedBranchId]);

  useEffect(() => {
    if (tab === "stock" && selectedBranchId) fetchBranchProducts(selectedBranchId);
  }, [tab, selectedBranchId, fetchBranchProducts]);

  const fetchContactSettings = useCallback(async () => {
    setContactLoading(true);
    try {
      const res = await fetch(`${API}/contact-settings/admin`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setContactForm({
          email:           data.email           || "",
          emailSub:        data.emailSub        || "",
          phone:           data.phone           || "",
          phoneSub:        data.phoneSub        || "",
          address:         data.address         || "",
          addressSub:      data.addressSub      || "",
          smtpHost:        data.smtpHost        || "",
          smtpPort:        data.smtpPort        || "587",
          smtpUser:        data.smtpUser        || "",
          smtpPass:        data.smtpPass        || "",
          smtpFrom:        data.smtpFrom        || "",
          directLineEmail: data.directLineEmail || "",
        });
      }
    } finally {
      setContactLoading(false);
    }
  }, []);

  const fetchContactMessages = useCallback(async () => {
    setMessagesLoading(true);
    try {
      const res = await fetch(`${API}/contact-messages`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setContactMessages(data.messages || []);
      }
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "contact") {
      fetchContactSettings();
      fetchContactMessages();
    }
  }, [tab, fetchContactSettings, fetchContactMessages]);

  const fetchBenefits = useCallback(async () => {
    setBenefitsLoading(true);
    try {
      const res = await fetch(`${API}/customer-benefits`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setBenefitsForm({
          tierBenefitsVisible: data.tierBenefitsVisible ?? true,
          bronzeDiscount:   data.bronzeDiscount   ?? 0,
          silverDiscount:   data.silverDiscount   ?? 3,
          goldDiscount:     data.goldDiscount     ?? 7,
          platinumDiscount: data.platinumDiscount ?? 15,
          bronzeNext:       data.bronzeNext       ?? 500,
          silverNext:       data.silverNext       ?? 2000,
          goldNext:         data.goldNext         ?? 10000,
        });
      }
    } finally {
      setBenefitsLoading(false);
    }
  }, []);

  const handleBenefitsSave = async () => {
    setBenefitsSaving(true);
    try {
      const res = await fetch(`${API}/customer-benefits`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(benefitsForm),
      });
      if (res.ok) {
        toast({ title: "Customer benefits saved", description: "Changes are now live for all users." });
      } else {
        const j = await res.json().catch(() => ({}));
        toast({ title: "Error", description: j.error || "Failed to save", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    } finally {
      setBenefitsSaving(false);
    }
  };

  useEffect(() => {
    if (tab === "benefits") fetchBenefits();
    if (tab === "slang") {
      setSlangLoading(true);
      fetch(`${API}/search/slang`).then(r => r.ok ? r.json() : []).then(setSlangTerms).catch(() => {}).finally(() => setSlangLoading(false));
    }
    if (tab === "bundles") {
      setBundlesLoading(true);
      fetch(`${API}/bundles/all`, { credentials: "include" }).then(r => r.ok ? r.json() : []).then(setBundles).catch(() => {}).finally(() => setBundlesLoading(false));
    }
    if (tab === "compat") {
      setCompatLoading(true);
      fetch(`${API}/compatibility-games`).then(r => r.ok ? r.json() : []).then(setCompatGames).catch(() => {}).finally(() => setCompatLoading(false));
    }
    if (tab === "cod") {
      setCodLoading(true);
      fetch(`${API}/cod-escrow`).then(r => r.ok ? r.json() : null).then(d => { if (d) setCodSettings(d); }).catch(() => {}).finally(() => setCodLoading(false));
    }
  }, [tab, fetchBenefits]);

  const handleSlangAdd = async () => {
    if (!slangForm.term.trim() || !slangForm.mapsTo.trim()) return;
    setSlangSaving(true);
    try {
      const res = await fetch(`${API}/search/slang`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slangForm),
      });
      if (res.ok) {
        const d = await res.json();
        setSlangTerms(t => [d, ...t]);
        setSlangForm({ term: "", mapsTo: "" });
        toast({ title: "Slang term added" });
      }
    } finally { setSlangSaving(false); }
  };

  const handleSlangDelete = async (id: number) => {
    await fetch(`${API}/search/slang/${id}`, { method: "DELETE", credentials: "include" });
    setSlangTerms(t => t.filter(s => s.id !== id));
    toast({ title: "Slang term removed" });
  };

  const handleBundleAdd = async () => {
    setBundleSaving(true);
    try {
      const body = {
        ...bundleForm,
        discountPct: parseFloat(bundleForm.discountPct) || 0,
        items: bundleForm.items.filter(i => i.productId).map(i => ({ productId: parseInt(i.productId), quantity: parseInt(i.quantity) || 1 })),
      };
      const res = await fetch(`${API}/bundles`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const d = await res.json();
        setBundles(bs => [d, ...bs]);
        setBundleForm({ slug: "", name: "", description: "", discountPct: "0", badgeText: "", imageUrl: "", items: [{ productId: "", quantity: "1" }] });
        setBundleFormMode("none");
        toast({ title: "Bundle created" });
      }
    } finally { setBundleSaving(false); }
  };

  const handleBundleToggle = async (bundle: Bundle) => {
    const res = await fetch(`${API}/bundles/${bundle.id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !bundle.active }),
    });
    if (res.ok) {
      setBundles(bs => bs.map(b => b.id === bundle.id ? { ...b, active: !b.active } : b));
    }
  };

  const handleBundleDelete = async (id: number) => {
    await fetch(`${API}/bundles/${id}`, { method: "DELETE", credentials: "include" });
    setBundles(bs => bs.filter(b => b.id !== id));
    toast({ title: "Bundle deleted" });
  };

  const handleCompatAdd = async () => {
    setCompatSaving(true);
    try {
      const res = await fetch(`${API}/compatibility-games`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(compatForm),
      });
      if (res.ok) {
        const d = await res.json();
        setCompatGames(gs => [d, ...gs]);
        setCompatForm({ slug: "", name: "", categorySlug: "gpus", specField: "", minSpec: "", recSpec: "", imageUrl: "" });
        setCompatFormMode("none");
        toast({ title: "Compatibility game added" });
      }
    } finally { setCompatSaving(false); }
  };

  const handleCompatToggle = async (game: CompatGame) => {
    const res = await fetch(`${API}/compatibility-games/${game.id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !game.active }),
    });
    if (res.ok) setCompatGames(gs => gs.map(g => g.id === game.id ? { ...g, active: !g.active } : g));
  };

  const handleCompatDelete = async (id: number) => {
    await fetch(`${API}/compatibility-games/${id}`, { method: "DELETE", credentials: "include" });
    setCompatGames(gs => gs.filter(g => g.id !== id));
    toast({ title: "Game removed" });
  };

  const handleCodSave = async () => {
    setCodSaving(true);
    try {
      const res = await fetch(`${API}/cod-escrow`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(codSettings),
      });
      if (res.ok) toast({ title: "CoD Escrow settings saved" });
    } finally { setCodSaving(false); }
  };

  const handleContactSave = async () => {
    setContactSaving(true);
    try {
      const res = await fetch(`${API}/contact-settings`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm),
      });
      if (res.ok) {
        toast({ title: "Contact settings saved", description: "Changes are now live on the Contact page." });
      } else {
        const j = await res.json().catch(() => ({}));
        toast({ title: "Error", description: j.error || "Failed to save", variant: "destructive" });
      }
    } finally {
      setContactSaving(false);
    }
  };

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

  /* ── Category CRUD handlers ── */

  const handleCreateCategory = async () => {
    if (!catForm.name || !catForm.slug) return;
    setCatSaving(true);
    try {
      const res = await fetch(`${API}/categories`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(catForm),
      });
      if (res.ok) {
        toast({ title: "Category created" });
        setCatForm({ name: "", slug: "", description: "" });
        setCatAutoSlug(true);
        fetchCategories();
      } else {
        const j = await res.json();
        toast({ title: "Error", description: j.message || j.error, variant: "destructive" });
      }
    } finally { setCatSaving(false); }
  };

  const handleUpdateCategory = async () => {
    if (!editCat || !catForm.name) return;
    setCatSaving(true);
    try {
      const res = await fetch(`${API}/categories/${editCat.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: catForm.name, description: catForm.description }),
      });
      if (res.ok) {
        toast({ title: "Category updated" });
        setEditCat(null);
        setCatForm({ name: "", slug: "", description: "" });
        fetchCategories();
      } else {
        const j = await res.json();
        toast({ title: "Error", description: j.message || j.error, variant: "destructive" });
      }
    } finally { setCatSaving(false); }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      const res = await fetch(`${API}/categories/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        toast({ title: "Category deleted" });
        setConfirmDeleteCat(null);
        fetchCategories();
      } else {
        const j = await res.json();
        toast({ title: "Cannot delete", description: j.message || j.error, variant: "destructive" });
        setConfirmDeleteCat(null);
      }
    } catch {
      toast({ title: "Error deleting category", variant: "destructive" });
      setConfirmDeleteCat(null);
    }
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
            { id: "categories", label: "Categories", icon: Layers },
            { id: "contact",    label: "Contact",    icon: MessageSquare },
            { id: "benefits",   label: "Benefits",   icon: Star },
            { id: "slang",      label: "Slang",      icon: BookType },
            { id: "bundles",    label: "Bundles",    icon: ShoppingBag },
            { id: "compat",     label: "Will it Run",icon: Gamepad2 },
            { id: "cod",        label: "CoD Escrow", icon: ShieldCheck },
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
                  <ProductForm onSave={handleCreate} onCancel={() => setView("list")} saving={saving} availableCategories={categories} />
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
                    availableCategories={categories}
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

        {/* ===================== CATEGORIES TAB ===================== */}
        {tab === "categories" && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-bold text-xl uppercase flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" /> Category Management
              </h2>
              <p className="font-mono text-xs text-muted-foreground">{categories.length} categories</p>
            </div>

            {/* ── Create / Edit form ── */}
            <div className="bg-card border border-border rounded-sm p-6">
              <h3 className="font-heading font-bold uppercase tracking-wider mb-5 pb-3 border-b border-border">
                {editCat ? `Editing: ${editCat.name}` : "Add New Category"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-1.5`}>Name *</label>
                  <input
                    className="w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary transition-colors"
                    value={catForm.name}
                    placeholder="e.g. Cooling"
                    onChange={(e) => {
                      const name = e.target.value;
                      setCatForm((f) => ({
                        ...f,
                        name,
                        slug: catAutoSlug && !editCat
                          ? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
                          : f.slug,
                      }));
                    }}
                  />
                </div>
                {!editCat && (
                  <div>
                    <label className="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Slug *</label>
                    <input
                      className="w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary transition-colors"
                      value={catForm.slug}
                      placeholder="e.g. cooling"
                      onChange={(e) => { setCatAutoSlug(false); setCatForm((f) => ({ ...f, slug: e.target.value })); }}
                    />
                  </div>
                )}
                <div className={editCat ? "sm:col-span-2" : "sm:col-span-2"}>
                  <label className="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Description</label>
                  <input
                    className="w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary transition-colors"
                    value={catForm.description}
                    placeholder="Optional short description"
                    onChange={(e) => setCatForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-5 pt-4 border-t border-border">
                {editCat ? (
                  <>
                    <button
                      onClick={handleUpdateCategory}
                      disabled={catSaving || !catForm.name}
                      className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-heading font-bold uppercase text-sm rounded-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {catSaving ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                      Save Changes
                    </button>
                    <button
                      onClick={() => { setEditCat(null); setCatForm({ name: "", slug: "", description: "" }); setCatAutoSlug(true); }}
                      className="px-5 py-2.5 border border-border rounded-sm font-heading font-bold uppercase text-sm hover:border-foreground/30 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleCreateCategory}
                    disabled={catSaving || !catForm.name || !catForm.slug}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-heading font-bold uppercase text-sm rounded-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {catSaving ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                    Create Category
                  </button>
                )}
              </div>
            </div>

            {/* ── Category list ── */}
            <div className="border border-border rounded-sm overflow-hidden">
              <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 bg-muted/30 px-5 py-3 border-b border-border">
                {["Name", "Slug", "Products", "Actions"].map((h) => (
                  <span key={h} className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{h}</span>
                ))}
              </div>

              {categories.length === 0 ? (
                <div className="py-16 text-center font-mono text-sm text-muted-foreground">
                  No categories yet. Create your first one above.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {categories.map((cat) => (
                    <div key={cat.id} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 items-center px-5 py-4 hover:bg-muted/10 transition-colors">
                      <div>
                        <p className="font-heading font-bold text-sm">{cat.name}</p>
                        {cat.description && <p className="font-mono text-xs text-muted-foreground truncate max-w-[200px]">{cat.description}</p>}
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">{cat.slug}</span>
                      <span className="font-mono text-sm">{cat.count ?? 0}</span>
                      <div className="flex items-center gap-2">
                        {confirmDeleteCat === cat.id ? (
                          <>
                            <button
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive/10 text-destructive border border-destructive/30 rounded-sm font-mono text-xs uppercase hover:bg-destructive/20 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" /> Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDeleteCat(null)}
                              className="px-3 py-1.5 border border-border rounded-sm font-mono text-xs uppercase hover:border-foreground/30 transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => { setEditCat(cat); setCatForm({ name: cat.name, slug: cat.slug, description: cat.description }); setCatAutoSlug(false); }}
                              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteCat(cat.id)}
                              className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== CONTACT TAB ===================== */}
        {tab === "contact" && (
          <div className="space-y-8">
            {contactLoading ? (
              <div className="flex items-center gap-3 py-12 justify-center text-muted-foreground font-mono text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading contact settings…
              </div>
            ) : (
              <>
                {/* ── Display Info ── */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-sm p-6">
                  <h3 className="font-heading font-bold uppercase text-sm tracking-widest mb-5 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" /> Contact Display Info
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { key: "email",      label: "Transmission Email",  placeholder: "ops@axiomcraft.systems" },
                      { key: "emailSub",   label: "Email Sub-text",      placeholder: "Response within 4 hours" },
                      { key: "phone",      label: "Direct Line",         placeholder: "+1 (800) AXIOM-00" },
                      { key: "phoneSub",   label: "Phone Sub-text",      placeholder: "Mon–Fri, 08:00–22:00 UTC" },
                      { key: "address",    label: "Coordinates",         placeholder: "Austin, TX 78701" },
                      { key: "addressSub", label: "Address Sub-text",    placeholder: "Hardware Innovation District" },
                    ].map(({ key, label, placeholder }) => (
                      <div key={key}>
                        <label className="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-1.5">{label}</label>
                        <input
                          type="text"
                          value={contactForm[key as keyof typeof contactForm]}
                          onChange={(e) => setContactForm((f) => ({ ...f, [key]: e.target.value }))}
                          placeholder={placeholder}
                          className="w-full bg-background border border-border rounded-sm px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* ── SMTP / Email Delivery ── */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card border border-border rounded-sm p-6">
                  <h3 className="font-heading font-bold uppercase text-sm tracking-widest mb-1 flex items-center gap-2">
                    <Inbox className="w-4 h-4 text-primary" /> Email Delivery (SMTP)
                  </h3>
                  <p className="font-mono text-xs text-muted-foreground mb-5">
                    Configure SMTP to receive transmissions at both your email and direct line simultaneously.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-1.5">SMTP Host</label>
                      <input type="text" value={contactForm.smtpHost} onChange={(e) => setContactForm((f) => ({ ...f, smtpHost: e.target.value }))} placeholder="smtp.gmail.com" className="w-full bg-background border border-border rounded-sm px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary transition-colors" />
                    </div>
                    <div>
                      <label className="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-1.5">SMTP Port</label>
                      <input type="text" value={contactForm.smtpPort} onChange={(e) => setContactForm((f) => ({ ...f, smtpPort: e.target.value }))} placeholder="587" className="w-full bg-background border border-border rounded-sm px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary transition-colors" />
                    </div>
                    <div>
                      <label className="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-1.5">SMTP Username</label>
                      <input type="text" value={contactForm.smtpUser} onChange={(e) => setContactForm((f) => ({ ...f, smtpUser: e.target.value }))} placeholder="your@email.com" className="w-full bg-background border border-border rounded-sm px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary transition-colors" />
                    </div>
                    <div>
                      <label className="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-1.5">SMTP Password</label>
                      <div className="relative">
                        <input type={showSmtpPass ? "text" : "password"} value={contactForm.smtpPass} onChange={(e) => setContactForm((f) => ({ ...f, smtpPass: e.target.value }))} placeholder="App password / secret" className="w-full bg-background border border-border rounded-sm px-3 py-2.5 pr-10 font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary transition-colors" />
                        <button type="button" onClick={() => setShowSmtpPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                          {showSmtpPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-1.5">From Address</label>
                      <input type="email" value={contactForm.smtpFrom} onChange={(e) => setContactForm((f) => ({ ...f, smtpFrom: e.target.value }))} placeholder="noreply@axiomcraft.systems" className="w-full bg-background border border-border rounded-sm px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary transition-colors" />
                    </div>
                    <div>
                      <label className="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Direct Line Email</label>
                      <input type="email" value={contactForm.directLineEmail} onChange={(e) => setContactForm((f) => ({ ...f, directLineEmail: e.target.value }))} placeholder="5551234567@txt.att.net" className="w-full bg-background border border-border rounded-sm px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary transition-colors" />
                      <p className="font-mono text-[10px] text-muted-foreground mt-1">Email-to-SMS gateway for your carrier (e.g. number@vtext.com)</p>
                    </div>
                  </div>
                </motion.div>

                {/* ── Save Button ── */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex justify-end">
                  <button
                    onClick={handleContactSave}
                    disabled={contactSaving}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-mono text-sm uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50 rounded-sm transition-colors"
                  >
                    {contactSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {contactSaving ? "Saving…" : "Save Settings"}
                  </button>
                </motion.div>

                {/* ── Inbox ── */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card border border-border rounded-sm p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-heading font-bold uppercase text-sm tracking-widest flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-primary" /> Transmission Inbox
                      <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-sm font-mono text-[10px]">{contactMessages.length}</span>
                    </h3>
                    <button onClick={fetchContactMessages} disabled={messagesLoading} className="font-mono text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                      {messagesLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Refresh
                    </button>
                  </div>

                  {messagesLoading ? (
                    <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground font-mono text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                    </div>
                  ) : contactMessages.length === 0 ? (
                    <div className="py-12 text-center">
                      <Inbox className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                      <p className="font-mono text-xs text-muted-foreground">No transmissions received yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[...contactMessages].reverse().map((msg) => (
                        <div key={msg.id} className="border border-border rounded-sm overflow-hidden">
                          <button
                            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                            onClick={() => setExpandedMessage(expandedMessage === msg.id ? null : msg.id)}
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              <div className="w-8 h-8 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                <User className="w-4 h-4 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-mono text-sm text-foreground truncate">{msg.name}</p>
                                <p className="font-mono text-xs text-muted-foreground truncate">{msg.email} · {msg.reason}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 ml-4">
                              <span className="font-mono text-[10px] text-muted-foreground hidden sm:block">
                                {new Date(msg.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedMessage === msg.id ? "rotate-180" : ""}`} />
                            </div>
                          </button>
                          {expandedMessage === msg.id && (
                            <div className="px-4 pb-4 border-t border-border bg-background/50">
                              <p className="font-mono text-xs text-muted-foreground mt-3 mb-1 uppercase tracking-widest">Message Payload</p>
                              <p className="font-mono text-sm text-foreground whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                              <a href={`mailto:${msg.email}`} className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 border border-primary/30 text-primary font-mono text-xs uppercase hover:bg-primary/10 transition-colors rounded-sm">
                                <Mail className="w-3.5 h-3.5" /> Reply
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              </>
            )}
          </div>
        )}

        {/* ===================== BENEFITS TAB ===================== */}
        {tab === "benefits" && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-heading font-bold text-xl uppercase tracking-wide flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary" /> Customer Benefits
                </h2>
                <p className="text-muted-foreground text-sm mt-1 font-mono">Control loyalty tier visibility and discount/threshold values.</p>
              </div>
              <button
                onClick={handleBenefitsSave}
                disabled={benefitsSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-black font-mono text-sm uppercase font-bold rounded-sm hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {benefitsSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>

            {benefitsLoading ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading…
              </div>
            ) : (
              <div className="space-y-6">
                {/* Visibility toggle */}
                <div className="bg-card border border-border rounded-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono font-bold uppercase tracking-wide text-sm">Operator Tier Benefits section</p>
                      <p className="text-muted-foreground text-xs mt-1">When hidden, the Tier Benefits block will not appear on the Account page for any customer.</p>
                    </div>
                    <button
                      onClick={() => setBenefitsForm((f) => ({ ...f, tierBenefitsVisible: !f.tierBenefitsVisible }))}
                      className={`flex items-center gap-2 px-4 py-2 rounded-sm font-mono text-xs uppercase font-bold border transition-all ${benefitsForm.tierBenefitsVisible ? "bg-primary/10 border-primary text-primary" : "bg-muted border-border text-muted-foreground"}`}
                    >
                      {benefitsForm.tierBenefitsVisible ? <><Eye className="w-4 h-4" /> Visible</> : <><EyeOff className="w-4 h-4" /> Hidden</>}
                    </button>
                  </div>
                </div>

                {/* Tier cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {([
                    { key: "bronze",   label: "Bronze",   color: "#CD7F32", discountKey: "bronzeDiscount",   nextKey: "bronzeNext",   hasNext: true  },
                    { key: "silver",   label: "Silver",   color: "#C0C0C0", discountKey: "silverDiscount",   nextKey: "silverNext",   hasNext: true  },
                    { key: "gold",     label: "Gold",     color: "#FFD700", discountKey: "goldDiscount",     nextKey: "goldNext",     hasNext: true  },
                    { key: "platinum", label: "Platinum", color: "#00F0FF", discountKey: "platinumDiscount", nextKey: null,           hasNext: false },
                  ] as const).map(({ key, label, color, discountKey, nextKey, hasNext }) => (
                    <div key={key} className="bg-card border border-border rounded-sm p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                        <span className="font-mono font-bold uppercase tracking-widest text-sm">{label}</span>
                      </div>
                      <div className={`grid gap-4 ${hasNext ? "grid-cols-2" : "grid-cols-1"}`}>
                        <div>
                          <label className="block font-mono text-xs text-muted-foreground uppercase tracking-wide mb-1">Discount %</label>
                          <input
                            type="number"
                            min={0}
                            max={99}
                            value={benefitsForm[discountKey]}
                            onChange={(e) => setBenefitsForm((f) => ({ ...f, [discountKey]: Number(e.target.value) }))}
                            className="w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary"
                          />
                        </div>
                        {hasNext && nextKey && (
                          <div>
                            <label className="block font-mono text-xs text-muted-foreground uppercase tracking-wide mb-1">Spend to upgrade ($)</label>
                            <input
                              type="number"
                              min={0}
                              value={benefitsForm[nextKey]}
                              onChange={(e) => setBenefitsForm((f) => ({ ...f, [nextKey]: Number(e.target.value) }))}
                              className="w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary"
                            />
                          </div>
                        )}
                        {!hasNext && (
                          <div className="flex items-end pb-2">
                            <p className="font-mono text-xs text-muted-foreground italic">Max tier — no spend threshold.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ===================== SLANG TAB ===================== */}
        {tab === "slang" && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-heading font-bold text-xl uppercase tracking-wide flex items-center gap-2">
                  <BookType className="w-5 h-5 text-primary" /> Smart Search Slang
                </h2>
                <p className="text-muted-foreground text-sm mt-1 font-mono">Map slang terms to product names for search expansion.</p>
              </div>
            </div>
            <div className="bg-card border border-border rounded-sm p-5 mb-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-xs uppercase text-muted-foreground mb-1.5">Slang term</label>
                  <input className="w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary" placeholder="e.g. gpu for gaming" value={slangForm.term} onChange={e => setSlangForm(f => ({ ...f, term: e.target.value }))} />
                </div>
                <div>
                  <label className="block font-mono text-xs uppercase text-muted-foreground mb-1.5">Maps to (comma-separated terms)</label>
                  <input className="w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary" placeholder="e.g. RTX, GeForce, graphics card" value={slangForm.mapsTo} onChange={e => setSlangForm(f => ({ ...f, mapsTo: e.target.value }))} />
                </div>
              </div>
              <button onClick={handleSlangAdd} disabled={slangSaving} className="flex items-center gap-2 px-5 py-2 bg-primary text-black font-mono text-sm uppercase font-bold rounded-sm hover:bg-primary/90 transition-all disabled:opacity-50">
                {slangSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add Term
              </button>
            </div>
            {slangLoading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading…</div>
            ) : (
              <div className="space-y-2">
                {slangTerms.length === 0 && <p className="font-mono text-sm text-muted-foreground">No slang terms configured yet.</p>}
                {slangTerms.map(t => (
                  <div key={t.id} className="flex items-center gap-3 bg-card border border-border rounded-sm px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm font-bold text-foreground">{t.term}</p>
                      <p className="font-mono text-xs text-muted-foreground">→ {t.mapsTo}</p>
                    </div>
                    <button onClick={() => handleSlangDelete(t.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1.5"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ===================== BUNDLES TAB ===================== */}
        {tab === "bundles" && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-heading font-bold text-xl uppercase tracking-wide flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-primary" /> Creator / Student Bundles
                </h2>
                <p className="text-muted-foreground text-sm mt-1 font-mono">Create curated hardware bundles with discounts.</p>
              </div>
              <button onClick={() => setBundleFormMode(bundleFormMode === "add" ? "none" : "add")} className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-mono text-sm uppercase font-bold rounded-sm hover:bg-primary/90 transition-all">
                <Plus className="w-4 h-4" /> New Bundle
              </button>
            </div>
            <AnimatePresence>
              {bundleFormMode === "add" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
                  <div className="bg-card border border-border rounded-sm p-5 space-y-4">
                    <h3 className="font-mono font-bold uppercase text-sm tracking-wide">New Bundle</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { label: "Bundle Name", key: "name", placeholder: "e.g. Creator Pro Pack" },
                        { label: "URL Slug", key: "slug", placeholder: "creator-pro-pack" },
                        { label: "Badge Text", key: "badgeText", placeholder: "e.g. SAVE 15%" },
                        { label: "Discount %", key: "discountPct", placeholder: "15" },
                        { label: "Image URL", key: "imageUrl", placeholder: "https://..." },
                      ].map(({ label, key, placeholder }) => (
                        <div key={key}>
                          <label className="block font-mono text-xs uppercase text-muted-foreground mb-1.5">{label}</label>
                          <input className="w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary" placeholder={placeholder} value={(bundleForm as any)[key]} onChange={e => setBundleForm(f => ({ ...f, [key]: e.target.value }))} />
                        </div>
                      ))}
                    </div>
                    <div>
                      <label className="block font-mono text-xs uppercase text-muted-foreground mb-1.5">Description</label>
                      <textarea className="w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary resize-none" rows={2} value={bundleForm.description} onChange={e => setBundleForm(f => ({ ...f, description: e.target.value }))} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="font-mono text-xs uppercase text-muted-foreground">Bundle Items (Product IDs)</label>
                        <button type="button" onClick={() => setBundleForm(f => ({ ...f, items: [...f.items, { productId: "", quantity: "1" }] }))} className="font-mono text-xs text-primary hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Add row</button>
                      </div>
                      {bundleForm.items.map((item, i) => (
                        <div key={i} className="flex gap-2 mb-2">
                          <input className="flex-1 bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary" placeholder="Product ID" type="number" value={item.productId} onChange={e => setBundleForm(f => ({ ...f, items: f.items.map((it, idx) => idx === i ? { ...it, productId: e.target.value } : it) }))} />
                          <input className="w-20 bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary" placeholder="Qty" type="number" min="1" value={item.quantity} onChange={e => setBundleForm(f => ({ ...f, items: f.items.map((it, idx) => idx === i ? { ...it, quantity: e.target.value } : it) }))} />
                          <button type="button" onClick={() => setBundleForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))} className="p-2 text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <button onClick={handleBundleAdd} disabled={bundleSaving} className="flex items-center gap-2 px-5 py-2 bg-primary text-black font-mono text-sm uppercase font-bold rounded-sm hover:bg-primary/90 disabled:opacity-50">
                        {bundleSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Create Bundle
                      </button>
                      <button onClick={() => setBundleFormMode("none")} className="px-4 py-2 border border-border font-mono text-sm text-muted-foreground rounded-sm hover:text-foreground">Cancel</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {bundlesLoading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading…</div>
            ) : (
              <div className="space-y-3">
                {bundles.length === 0 && <p className="font-mono text-sm text-muted-foreground">No bundles created yet.</p>}
                {bundles.map(b => (
                  <div key={b.id} className={`bg-card border rounded-sm px-4 py-4 flex items-center gap-4 ${b.active ? "border-border" : "border-border/40 opacity-60"}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono font-bold text-sm">{b.name} <span className="font-normal text-muted-foreground">/{b.slug}</span></p>
                      <p className="font-mono text-xs text-muted-foreground">{b.discountPct}% off · {b.items?.length || 0} products · {b.badgeText}</p>
                    </div>
                    <button onClick={() => handleBundleToggle(b)} className={`px-3 py-1.5 font-mono text-xs uppercase rounded-sm border transition-colors ${b.active ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground"}`}>
                      {b.active ? "Active" : "Inactive"}
                    </button>
                    <button onClick={() => handleBundleDelete(b.id)} className="text-muted-foreground hover:text-destructive p-1.5"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ===================== COMPAT TAB ===================== */}
        {tab === "compat" && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-heading font-bold text-xl uppercase tracking-wide flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-primary" /> Compatibility Games
                </h2>
                <p className="text-muted-foreground text-sm mt-1 font-mono">Configure games for the "Will it Run?" checker on product pages.</p>
              </div>
              <button onClick={() => setCompatFormMode(compatFormMode === "add" ? "none" : "add")} className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-mono text-sm uppercase font-bold rounded-sm hover:bg-primary/90 transition-all">
                <Plus className="w-4 h-4" /> Add Game
              </button>
            </div>
            <AnimatePresence>
              {compatFormMode === "add" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
                  <div className="bg-card border border-border rounded-sm p-5 space-y-4">
                    <h3 className="font-mono font-bold uppercase text-sm">New Game</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div><label className="block font-mono text-xs uppercase text-muted-foreground mb-1.5">Game Name</label><input className="w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary" placeholder="e.g. Cyberpunk 2077" value={compatForm.name} onChange={e => setCompatForm(f => ({ ...f, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-") }))} /></div>
                      <div><label className="block font-mono text-xs uppercase text-muted-foreground mb-1.5">Slug</label><input className="w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary" value={compatForm.slug} onChange={e => setCompatForm(f => ({ ...f, slug: e.target.value }))} /></div>
                      <div><label className="block font-mono text-xs uppercase text-muted-foreground mb-1.5">Category (applies to)</label><select className="w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary" value={compatForm.categorySlug} onChange={e => setCompatForm(f => ({ ...f, categorySlug: e.target.value }))}>
                        {CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.label}</option>)}
                      </select></div>
                      <div><label className="block font-mono text-xs uppercase text-muted-foreground mb-1.5">Spec field to compare</label><input className="w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary" placeholder="e.g. VRAM" value={compatForm.specField} onChange={e => setCompatForm(f => ({ ...f, specField: e.target.value }))} /></div>
                      <div><label className="block font-mono text-xs uppercase text-muted-foreground mb-1.5">Minimum spec</label><input className="w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary" placeholder="e.g. 8 GB" value={compatForm.minSpec} onChange={e => setCompatForm(f => ({ ...f, minSpec: e.target.value }))} /></div>
                      <div><label className="block font-mono text-xs uppercase text-muted-foreground mb-1.5">Recommended spec</label><input className="w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary" placeholder="e.g. 16 GB" value={compatForm.recSpec} onChange={e => setCompatForm(f => ({ ...f, recSpec: e.target.value }))} /></div>
                      <div className="sm:col-span-2"><label className="block font-mono text-xs uppercase text-muted-foreground mb-1.5">Image URL (optional)</label><input className="w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary" placeholder="https://..." value={compatForm.imageUrl} onChange={e => setCompatForm(f => ({ ...f, imageUrl: e.target.value }))} /></div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={handleCompatAdd} disabled={compatSaving} className="flex items-center gap-2 px-5 py-2 bg-primary text-black font-mono text-sm uppercase font-bold rounded-sm hover:bg-primary/90 disabled:opacity-50">
                        {compatSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Add Game
                      </button>
                      <button onClick={() => setCompatFormMode("none")} className="px-4 py-2 border border-border font-mono text-sm text-muted-foreground rounded-sm hover:text-foreground">Cancel</button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {compatLoading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading…</div>
            ) : (
              <div className="space-y-3">
                {compatGames.length === 0 && <p className="font-mono text-sm text-muted-foreground">No games configured yet.</p>}
                {compatGames.map(g => (
                  <div key={g.id} className={`bg-card border rounded-sm px-4 py-4 flex items-center gap-4 ${g.active ? "border-border" : "border-border/40 opacity-60"}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono font-bold text-sm">{g.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{g.categorySlug} · {g.specField}: min {g.minSpec} / rec {g.recSpec}</p>
                    </div>
                    <button onClick={() => handleCompatToggle(g)} className={`px-3 py-1.5 font-mono text-xs uppercase rounded-sm border transition-colors ${g.active ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground"}`}>
                      {g.active ? "Active" : "Inactive"}
                    </button>
                    <button onClick={() => handleCompatDelete(g.id)} className="text-muted-foreground hover:text-destructive p-1.5"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ===================== COD ESCROW TAB ===================== */}
        {tab === "cod" && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-heading font-bold text-xl uppercase tracking-wide flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" /> Cash-on-Delivery Escrow
                </h2>
                <p className="text-muted-foreground text-sm mt-1 font-mono">Set a commitment fee for high-value CoD orders to prevent fraud.</p>
              </div>
              <button onClick={handleCodSave} disabled={codSaving} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-black font-mono text-sm uppercase font-bold rounded-sm hover:bg-primary/90 transition-all disabled:opacity-50">
                {codSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Settings
              </button>
            </div>
            {codLoading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading…</div>
            ) : (
              <div className="space-y-5 max-w-lg">
                <div className="bg-card border border-border rounded-sm p-5 space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono font-bold uppercase tracking-wide text-sm">CoD Escrow Enabled</p>
                      <p className="text-muted-foreground text-xs mt-1">When enabled, high-value CoD orders will require a digital commitment fee.</p>
                    </div>
                    <button
                      onClick={() => setCodSettings(s => ({ ...s, enabled: !s.enabled }))}
                      className={`flex items-center gap-2 px-4 py-2 rounded-sm font-mono text-xs uppercase font-bold border transition-all ${codSettings.enabled ? "bg-primary/10 border-primary text-primary" : "bg-muted border-border text-muted-foreground"}`}
                    >
                      {codSettings.enabled ? <><Eye className="w-4 h-4" /> Enabled</> : <><EyeOff className="w-4 h-4" /> Disabled</>}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-mono text-xs uppercase text-muted-foreground mb-1.5">High-value threshold ($)</label>
                      <input
                        type="number"
                        min="0"
                        className="w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary"
                        value={codSettings.highValueThreshold}
                        onChange={e => setCodSettings(s => ({ ...s, highValueThreshold: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-xs uppercase text-muted-foreground mb-1.5">Commitment fee (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary"
                        value={codSettings.commitmentFeePct}
                        onChange={e => setCodSettings(s => ({ ...s, commitmentFeePct: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                  {codSettings.enabled && (
                    <div className="border border-amber-400/30 bg-amber-400/5 rounded-sm p-3 font-mono text-xs text-muted-foreground">
                      Orders delivered via CoD above ${codSettings.highValueThreshold.toLocaleString()} will display a {codSettings.commitmentFeePct}% refundable commitment fee at checkout.
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
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
