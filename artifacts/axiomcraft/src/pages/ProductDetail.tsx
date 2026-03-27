import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { useGetProduct } from "@workspace/api-client-react";
import { type Product } from "@workspace/api-client-react";
import { useCartManager } from "@/hooks/use-cart-manager";
import { ProductCard } from "@/components/ProductCard";
import { WishlistButton } from "@/components/WishlistButton";
import { StockBadge } from "@/components/StockBadge";
import { HoldForMeModal } from "@/components/HoldForMeModal";
import { ReviewVoteButtons } from "@/components/ReviewVoteButtons";
import { ReviewSummary } from "@/components/ReviewSummary";
import { ShoppingCart, ChevronLeft, ShieldCheck, Truck, Cpu, Zap, Bell, BellRing, CheckCircle2, BookmarkCheck, Star, Camera, X, Gamepad2, TrendingUp, Flame, Package2, ChevronDown } from "lucide-react";
import { useRecentlyViewedStore } from "@/store/recently-viewed-store";
import { useUserStore } from "@/store/user-store";
import { useToast } from "@/hooks/use-toast";
import {
  motion,
  useInView,
  useScroll,
  useTransform,
  AnimatePresence,
  type Variants,
} from "framer-motion";

const API = import.meta.env.VITE_API_URL || `${import.meta.env.BASE_URL}api`;

function ScanOverlay() {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
    >
      <motion.div
        className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"
        animate={{ top: ["-2%", "102%"] }}
        transition={{ duration: 2.5, ease: "linear", delay: 0.6 }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,240,255,0.015)_50%)] bg-[length:100%_4px]" />
    </motion.div>
  );
}

function SpecRow({ spec, index }: { spec: { name: string; value: string }; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-20px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -20 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className={`flex flex-col sm:flex-row border-b border-border/50 last:border-0 ${index % 2 === 0 ? "bg-muted/20" : ""}`}
    >
      <div className="sm:w-1/3 py-3 px-4 font-mono text-xs uppercase text-muted-foreground border-r-0 sm:border-r border-border/50">
        {spec.name}
      </div>
      <div className="sm:w-2/3 py-3 px-4 font-mono text-sm text-foreground">
        {spec.value}
      </div>
    </motion.div>
  );
}

function AnimatedPrice({ price }: { price: number }) {
  const [display, setDisplay] = useState(price);
  const prevRef = useRef(price);

  useEffect(() => {
    if (price === prevRef.current) return;
    const start = prevRef.current;
    const end = price;
    const duration = 400;
    const steps = 24;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (step >= steps) {
        clearInterval(timer);
        setDisplay(end);
        prevRef.current = end;
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [price]);

  return <span>${display.toLocaleString()}</span>;
}

function PerformanceBar({ label, value, delay }: { label: string; value: number; delay: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <div ref={ref} className="space-y-1.5">
      <div className="flex justify-between font-mono text-xs text-muted-foreground">
        <span className="uppercase">{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full"
          initial={{ width: 0 }}
          animate={isInView ? { width: `${value}%` } : {}}
          transition={{ duration: 1, delay, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

export default function ProductDetail() {
  const { id } = useParams();
  const productId = parseInt(id || "0", 10);

  const { data: product, isLoading, error } = useGetProduct(productId);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [compatibleProducts, setCompatibleProducts] = useState<Product[]>([]);

  const { addToCart, isAdding } = useCartManager();
  const { toast } = useToast();
  const { user } = useUserStore();
  const { addItem: addRecentlyViewed } = useRecentlyViewedStore();

  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<number | undefined>(undefined);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageZoomed, setImageZoomed] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifySubscribed, setNotifySubscribed] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [holdModalOpen, setHoldModalOpen] = useState(false);

  /* Reviews state */
  interface ReviewItem {
    id: number; userId: number | null; rating: number; title: string;
    body: string; reviewer: string; verified: boolean;
    photoUrl: string | null; helpfulCount: number; unhelpfulCount: number; createdAt: string;
  }
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, title: "", body: "", photoUrl: "" });
  const [submittingReview, setSubmittingReview] = useState(false);

  /* Velocity heatmap */
  const [velocityMap, setVelocityMap] = useState<Record<number, number>>({});
  /* "Will it Run?" */
  interface CompatGame { id: number; name: string; slug: string; categorySlug: string; specField: string; minSpec: string; recSpec: string; imageUrl: string; }
  const [compatGames, setCompatGames] = useState<CompatGame[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  /* Bundle membership */
  interface BundleRef { id: number; name: string; slug: string; discountPct: number; badgeText: string; }
  const [productBundles, setProductBundles] = useState<BundleRef[]>([]);

  const imageRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: imageRef, offset: ["start start", "end start"] });
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);

  useEffect(() => {
    if (product?.variants && product.variants.length > 0 && selectedVariantId === undefined) {
      setSelectedVariantId(product.variants[0].id);
    }
  }, [product, selectedVariantId]);

  // Fetch similar + compatible products
  useEffect(() => {
    if (!productId || isNaN(productId)) return;
    setSimilarProducts([]);
    setCompatibleProducts([]);
    Promise.all([
      fetch(`${API}/products/${productId}/similar`).then((r) => r.json()).catch(() => ({ products: [] })),
      fetch(`${API}/products/${productId}/compatible`).then((r) => r.json()).catch(() => ({ products: [] })),
    ]).then(([simData, compData]) => {
      setSimilarProducts(simData.products || []);
      setCompatibleProducts(compData.products || []);
    });
  }, [productId]);

  // Reset on product change
  useEffect(() => {
    setSelectedVariantId(undefined);
    setQuantity(1);
    setImageLoaded(false);
    setNotifySubscribed(false);
    setNotifyEmail(user?.email || "");
    setReviews([]);
    setShowReviewForm(false);
  }, [productId, user?.email]);

  // Fetch reviews
  useEffect(() => {
    if (!productId || isNaN(productId)) return;
    setReviewsLoading(true);
    fetch(`${API}/products/${productId}/reviews`)
      .then(r => r.ok ? r.json() : { reviews: [] })
      .then(d => setReviews(d.reviews || []))
      .catch(() => {})
      .finally(() => setReviewsLoading(false));
  }, [productId]);

  const submitReview = async () => {
    if (!newReview.body.trim()) return;
    setSubmittingReview(true);
    try {
      const res = await fetch(`${API}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ productId, ...newReview }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setReviews(prev => [data.review, ...prev]);
      setShowReviewForm(false);
      setNewReview({ rating: 5, title: "", body: "", photoUrl: "" });
      if (data.discountCode) {
        toast({ title: "5% Discount Earned!", description: `Photo review reward: ${data.discountCode}`, className: "bg-card border-primary text-foreground" });
      } else {
        toast({ title: "Review Submitted", description: "Thank you for your feedback!", className: "bg-card border-primary text-foreground" });
      }
    } catch {
      toast({ title: "Failed", description: "Could not submit review.", variant: "destructive" });
    } finally {
      setSubmittingReview(false); }
  };

  // Fetch velocity, compat games, and bundles when product loads
  useEffect(() => {
    fetch(`${API}/products/velocity`)
      .then((r) => r.ok ? r.json() : {})
      .then(setVelocityMap)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!product) return;
    Promise.all([
      fetch(`${API}/compatibility-games`).then((r) => r.ok ? r.json() : []),
      fetch(`${API}/bundles`).then((r) => r.ok ? r.json() : []),
    ]).then(([games, bundles]: [CompatGame[], any[]]) => {
      const filtered = games.filter((g) => g.active && g.categorySlug === product.categorySlug);
      setCompatGames(filtered);
      if (filtered.length > 0) setSelectedGameId(filtered[0].id);
      const myBundles = bundles
        .filter((b: any) => b.items?.some((i: any) => i.productId === product.id))
        .map((b: any) => ({ id: b.id, name: b.name, slug: b.slug, discountPct: b.discountPct, badgeText: b.badgeText }));
      setProductBundles(myBundles);
    }).catch(() => {});
  }, [product?.id]);

  // Track recently viewed
  useEffect(() => {
    if (!product) return;
    addRecentlyViewed({
      id: product.id,
      name: product.name,
      slug: product.slug,
      category: product.category,
      basePrice: String(product.basePrice),
      salePrice: product.salePrice ? String(product.salePrice) : null,
      imageUrl: product.imageUrl,
      badge: product.badge ?? null,
      stock: product.stock,
    });
  }, [product?.id]);

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="aspect-square bg-muted/50 rounded-sm animate-pulse" />
            <div className="space-y-6 animate-pulse">
              <div className="h-4 bg-muted/50 rounded w-1/4" />
              <div className="h-12 bg-muted/50 rounded w-3/4" />
              <div className="h-6 bg-muted/50 rounded w-1/4" />
              <div className="h-24 bg-muted/50 rounded w-full" />
              <div className="h-14 bg-muted/50 rounded w-full" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !product) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Cpu className="w-16 h-16 text-muted-foreground mb-6 mx-auto" />
          </motion.div>
          <h1 className="text-3xl font-heading font-bold uppercase mb-2">Component Missing</h1>
          <p className="text-muted-foreground font-mono mb-8">The requested hardware could not be located.</p>
          <Link to="/products">
            <button className="px-6 py-3 border border-primary text-primary font-mono text-sm uppercase hover:bg-primary hover:text-primary-foreground transition-colors">
              Return to Catalog
            </button>
          </Link>
        </div>
      </Layout>
    );
  }

  const isOutOfStock = product.stock <= 0;
  const imageUrl = product.imageUrl || `https://picsum.photos/seed/${product.slug}/800/800`;
  const activeVariant = product.variants?.find((v) => v.id === selectedVariantId);
  const currentPrice =
    (product.salePrice ?? product.basePrice) + (activeVariant?.priceModifier || 0);

  const handleAddToCart = async () => {
    if (isOutOfStock) return;
    try {
      await addToCart(product.id, quantity, selectedVariantId);
      toast({
        title: "Integration Successful",
        description: `${quantity}x ${product.name} added to loadout.`,
        className: "bg-card border-primary",
      });
    } catch {
      toast({ title: "Error", description: "Failed to add to loadout.", variant: "destructive" });
    }
  };

  const handleNotifyMe = async () => {
    if (!notifyEmail.trim() || notifySubscribed) return;
    setNotifyLoading(true);
    try {
      const res = await fetch(`${API}/restock-notify`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, email: notifyEmail.trim() }),
      });
      if (res.ok) {
        setNotifySubscribed(true);
        toast({ title: "Restock Alert Set", description: "We'll notify you when this product is back.", className: "bg-card border-primary" });
      }
    } catch {}
    setNotifyLoading(false);
  };

  const performanceMetrics = [
    { label: "Compute Throughput", value: 92 },
    { label: "Thermal Efficiency", value: 78 },
    { label: "Power Delivery", value: 88 },
    { label: "Bandwidth", value: 95 },
  ];

  return (
    <Layout>
      {/* Breadcrumb */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-muted/30 border-b border-border"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-primary transition-colors uppercase"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Catalog
          </Link>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 mb-24">

          {/* ── Image Column ─────────────────────────────── */}
          <div ref={imageRef} className="relative">
            <div className="sticky top-28">
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="relative"
              >
                <motion.div
                  style={{ scale: imageScale }}
                  onClick={() => setImageZoomed(true)}
                  className="aspect-square bg-card border border-border rounded-sm overflow-hidden relative group cursor-zoom-in"
                >
                  <ScanOverlay />
                  <motion.img
                    src={imageUrl}
                    alt={product.name}
                    onLoad={() => setImageLoaded(true)}
                    initial={{ scale: 1.05, filter: "grayscale(100%)" }}
                    animate={imageLoaded ? { scale: 1, filter: "grayscale(60%)" } : {}}
                    whileHover={{ filter: "grayscale(0%)", scale: 1.03 }}
                    transition={{ duration: 0.8 }}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent z-10 pointer-events-none" />

                  {/* Badges */}
                  <div className="absolute top-4 left-4 z-20 flex gap-2">
                    {product.badge && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 }}
                        className="px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider bg-primary text-primary-foreground rounded-sm shadow-[0_0_15px_rgba(0,240,255,0.4)]"
                      >
                        {product.badge}
                      </motion.span>
                    )}
                    {isOutOfStock && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.9 }}
                        className="px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider bg-destructive text-destructive-foreground rounded-sm"
                      >
                        OUT OF STOCK
                      </motion.span>
                    )}
                  </div>

                  {/* Corner accents */}
                  {["top-2 left-2", "top-2 right-2", "bottom-2 left-2", "bottom-2 right-2"].map((pos, i) => (
                    <motion.div
                      key={i}
                      className={`absolute ${pos} w-4 h-4 border-primary/60 z-30`}
                      style={{
                        borderTopWidth: i < 2 ? 1 : 0,
                        borderBottomWidth: i >= 2 ? 1 : 0,
                        borderLeftWidth: i % 2 === 0 ? 1 : 0,
                        borderRightWidth: i % 2 === 1 ? 1 : 0,
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 + i * 0.08 }}
                    />
                  ))}
                </motion.div>

                {/* Performance Bars */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9, duration: 0.5 }}
                  className="mt-6 border border-border bg-card/50 rounded-sm p-5 space-y-3"
                >
                  <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-primary" />
                    Performance Index
                  </p>
                  {performanceMetrics.map((m, i) => (
                    <PerformanceBar key={m.label} label={m.label} value={m.value} delay={1.0 + i * 0.1} />
                  ))}
                </motion.div>
              </motion.div>
            </div>
          </div>

          {/* ── Info Column ──────────────────────────────── */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col pt-4"
          >
            <motion.div variants={itemVariants} className="mb-1">
              <span className="text-primary font-mono text-sm uppercase tracking-widest">{product.category}</span>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-4xl md:text-5xl font-heading font-bold uppercase tracking-tighter mb-4"
            >
              {product.name}
            </motion.h1>

            <motion.p variants={itemVariants} className="text-xl text-muted-foreground font-sans mb-8">
              {product.shortDescription}
            </motion.p>

            {/* Price */}
            <motion.div
              variants={itemVariants}
              className="flex items-end gap-4 mb-8 pb-8 border-b border-border"
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={currentPrice}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.25 }}
                  className="text-4xl font-mono font-bold text-foreground"
                >
                  <AnimatedPrice price={currentPrice} />
                </motion.span>
              </AnimatePresence>
              {product.salePrice && !activeVariant && (
                <span className="text-xl font-mono text-muted-foreground line-through pb-1">
                  ${product.basePrice.toLocaleString()}
                </span>
              )}
            </motion.div>

            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
              <motion.div variants={itemVariants} className="mb-8">
                <h3 className="font-mono text-sm uppercase text-muted-foreground mb-3">Configuration</h3>
                <div className="flex flex-wrap gap-3">
                  {product.variants.map((variant) => (
                    <motion.button
                      key={variant.id}
                      onClick={() => setSelectedVariantId(variant.id)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.96 }}
                      className={`px-4 py-2 font-mono text-sm border rounded-sm transition-all ${
                        selectedVariantId === variant.id
                          ? "border-primary bg-primary/10 text-primary shadow-[0_0_12px_rgba(0,240,255,0.2)]"
                          : "border-border bg-card text-foreground hover:border-primary/50"
                      }`}
                    >
                      {variant.name}
                      {variant.priceModifier > 0 && (
                        <span className="ml-2 text-xs text-primary">+${variant.priceModifier}</span>
                      )}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Actions */}
            <motion.div variants={itemVariants} className="flex flex-col gap-4 mb-10">
              <div className="flex gap-4">
                <div className="flex items-center border border-border bg-card rounded-sm w-32 overflow-hidden">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="flex-1 py-4 text-muted-foreground hover:text-primary font-mono transition-colors"
                    disabled={isOutOfStock}
                  >
                    −
                  </motion.button>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={quantity}
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      transition={{ duration: 0.15 }}
                      className="w-10 text-center font-mono font-bold"
                    >
                      {quantity}
                    </motion.span>
                  </AnimatePresence>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="flex-1 py-4 text-muted-foreground hover:text-primary font-mono transition-colors"
                    disabled={isOutOfStock}
                  >
                    +
                  </motion.button>
                </div>

                <motion.button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock || isAdding}
                  whileHover={isOutOfStock ? {} : { scale: 1.02, boxShadow: "0 0 20px rgba(0,240,255,0.3)" }}
                  whileTap={isOutOfStock ? {} : { scale: 0.98 }}
                  className="flex-1 bg-primary text-primary-foreground font-heading font-bold uppercase tracking-wider rounded-sm disabled:opacity-50 disabled:bg-muted disabled:text-muted-foreground flex items-center justify-center gap-3 transition-colors relative overflow-hidden group"
                >
                  <motion.div
                    className="absolute inset-0 bg-white/10"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.5 }}
                  />
                  <ShoppingCart className="w-5 h-5" />
                  {isOutOfStock ? "Depleted" : isAdding ? "Processing..." : "Acquire Component"}
                </motion.button>
                <WishlistButton productId={product.id} size="md" className="shrink-0" />
                {!isOutOfStock && user && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setHoldModalOpen(true)}
                    title="Hold for 2 hours at a branch"
                    className="shrink-0 w-12 min-h-[52px] flex items-center justify-center border border-border bg-card hover:border-primary/50 hover:text-primary text-muted-foreground rounded-sm transition-all"
                  >
                    <BookmarkCheck className="w-5 h-5" />
                  </motion.button>
                )}
              </div>

              {!isOutOfStock && product.stock <= 5 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-orange-400 font-mono text-sm flex items-center gap-2"
                >
                  <motion.div
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-2 h-2 rounded-full bg-orange-400"
                  />
                  Critical Stock Level: Only {product.stock} units remain.
                </motion.p>
              )}

              {/* Scarcity Heatmap */}
              {(() => {
                const v = velocityMap[product.id] || 0;
                if (v === 0) return null;
                const pct = Math.min((v / 20) * 100, 100);
                const heat = v >= 15 ? "from-red-500 to-orange-500" : v >= 6 ? "from-orange-400 to-amber-400" : "from-amber-400 to-yellow-400";
                const label = v >= 15 ? "🔥 Trending fast" : v >= 6 ? "High demand" : "Selling steadily";
                return (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1.5">
                    <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-orange-400" /> {label}</span>
                      <span>{v} sold in last 24h</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full bg-gradient-to-r ${heat}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                  </motion.div>
                );
              })()}

              {/* Bundle badges */}
              {productBundles.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-2">
                  {productBundles.map((b) => (
                    <a key={b.id} href={`/bundles/${b.slug}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/40 text-primary font-mono text-xs uppercase tracking-wider rounded-sm hover:bg-primary/20 transition-colors">
                      <Package2 className="w-3.5 h-3.5" />
                      {b.badgeText} — {b.name} ({b.discountPct}% off)
                    </a>
                  ))}
                </motion.div>
              )}

              {isOutOfStock && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-border bg-card/50 rounded-sm p-5"
                >
                  {notifySubscribed ? (
                    <div className="flex items-center gap-3 text-primary">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <div>
                        <p className="font-mono text-sm font-bold">Restock alert active</p>
                        <p className="font-mono text-xs text-muted-foreground">We'll notify {notifyEmail} when stock returns.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <Bell className="w-4 h-4 text-primary" />
                        <p className="font-mono text-sm font-bold uppercase">Notify Me When Back in Stock</p>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={notifyEmail}
                          onChange={(e) => setNotifyEmail(e.target.value)}
                          placeholder="your@email.com"
                          className="flex-1 bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary transition-colors"
                        />
                        <button
                          onClick={handleNotifyMe}
                          disabled={!notifyEmail.trim() || notifyLoading}
                          className="px-4 py-2 bg-primary text-primary-foreground font-mono text-xs uppercase font-bold rounded-sm hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                        >
                          {notifyLoading ? <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : <BellRing className="w-3.5 h-3.5" />}
                          Alert Me
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </motion.div>

            {/* Trust badges */}
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-2 gap-4 py-6 border-y border-border mb-12"
            >
              {[
                { icon: ShieldCheck, text: "5-Year Warranty" },
                { icon: Truck, text: "Express Delivery" },
              ].map((badge, i) => (
                <motion.div
                  key={i}
                  whileHover={{ x: 4 }}
                  className="flex items-center gap-3 text-muted-foreground"
                >
                  <badge.icon className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-sm font-mono">{badge.text}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* Description */}
            <motion.div variants={itemVariants} className="space-y-10">
              <div>
                <h3 className="text-2xl font-heading font-bold uppercase mb-4">Architecture Overview</h3>
                <p className="text-muted-foreground font-sans leading-relaxed">{product.description}</p>
              </div>

              {/* Specs table */}
              {product.specs && product.specs.length > 0 && (
                <div>
                  <h3 className="text-2xl font-heading font-bold uppercase mb-4">Technical Specifications</h3>
                  <div className="border border-border rounded-sm overflow-hidden bg-card">
                    {(product.specs as Array<{ name: string; value: string }>).map((spec, i) => (
                      <SpecRow key={i} spec={spec} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {/* Performance Impact Notes */}
              {(() => {
                const notes = (product as any).performanceNotes as Array<{ label: string; value: string }> | undefined;
                if (!notes || notes.length === 0) return null;
                return (
                  <div>
                    <h3 className="text-2xl font-heading font-bold uppercase mb-4 flex items-center gap-2">
                      <TrendingUp className="w-6 h-6 text-primary" /> Performance Impact
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {notes.map((n, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.08 }}
                          className="bg-primary/5 border border-primary/20 rounded-sm px-4 py-3 flex items-center gap-3"
                        >
                          <TrendingUp className="w-4 h-4 text-primary shrink-0" />
                          <div>
                            <p className="font-mono text-sm font-bold text-primary">{n.value}</p>
                            <p className="font-mono text-xs text-muted-foreground">{n.label}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* "Will it Run?" Compatibility Checker */}
              {compatGames.length > 0 && (
                <div>
                  <h3 className="text-2xl font-heading font-bold uppercase mb-4 flex items-center gap-2">
                    <Gamepad2 className="w-6 h-6 text-primary" /> Will it Run?
                  </h3>
                  <div className="border border-border bg-card rounded-sm p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <label className="font-mono text-xs uppercase text-muted-foreground shrink-0">Select game</label>
                      <div className="relative flex-1">
                        <select
                          value={selectedGameId ?? ""}
                          onChange={(e) => setSelectedGameId(Number(e.target.value))}
                          className="w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary appearance-none pr-8"
                        >
                          {compatGames.map((g) => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>
                    {(() => {
                      const game = compatGames.find((g) => g.id === selectedGameId);
                      if (!game) return null;
                      const specs = (product.specs as Array<{ name: string; value: string }>) || [];
                      const matchedSpec = specs.find((s) => s.name.toLowerCase().includes(game.specField.toLowerCase()));
                      const specVal = matchedSpec?.value || "";
                      const meetsMin = game.minSpec === "" || specVal.toLowerCase().includes(game.minSpec.toLowerCase()) || specVal >= game.minSpec;
                      const meetsRec = game.recSpec === "" || specVal.toLowerCase().includes(game.recSpec.toLowerCase()) || specVal >= game.recSpec;
                      const status = !specVal ? "unknown" : meetsRec ? "recommended" : meetsMin ? "minimum" : "below";
                      const statusConfig = {
                        recommended: { label: "Meets Recommended Specs", color: "text-emerald-400", border: "border-emerald-400/30", bg: "bg-emerald-400/5" },
                        minimum:     { label: "Meets Minimum Specs",     color: "text-amber-400",   border: "border-amber-400/30",   bg: "bg-amber-400/5"   },
                        below:       { label: "Below Minimum Specs",     color: "text-red-400",     border: "border-red-400/30",     bg: "bg-red-400/5"     },
                        unknown:     { label: "Specs Not Comparable",    color: "text-muted-foreground", border: "border-border", bg: "bg-muted/10" },
                      }[status];
                      return (
                        <motion.div key={game.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`border rounded-sm px-4 py-3 ${statusConfig.border} ${statusConfig.bg}`}>
                          <p className={`font-mono font-bold text-sm ${statusConfig.color}`}>{statusConfig.label}</p>
                          <div className="mt-2 font-mono text-xs text-muted-foreground space-y-0.5">
                            {game.specField && <p>Checking: <span className="text-foreground">{game.specField}</span></p>}
                            {game.minSpec && <p>Minimum: <span className="text-foreground">{game.minSpec}</span></p>}
                            {game.recSpec && <p>Recommended: <span className="text-foreground">{game.recSpec}</span></p>}
                            {specVal && <p>This product: <span className="text-foreground">{specVal}</span></p>}
                          </div>
                        </motion.div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        </div>

        {/* ── Customer Reviews ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="border-t border-border pt-16"
        >
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div className="flex items-baseline gap-3">
              <h2 className="text-3xl font-heading font-bold uppercase tracking-tight">Customer Reviews</h2>
              <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</span>
            </div>
            {user && (
              <button
                onClick={() => setShowReviewForm(f => !f)}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 border border-primary/40 text-primary font-mono text-xs uppercase tracking-wider rounded-sm hover:bg-primary/20 transition-colors"
              >
                <Star className="w-3.5 h-3.5" />
                {showReviewForm ? "Cancel" : "Write a Review"}
              </button>
            )}
          </div>

          {/* AI Summary */}
          <ReviewSummary productId={product.id} reviewCount={reviews.length} />

          {/* Write Review Form */}
          <AnimatePresence>
            {showReviewForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-8"
              >
                <div className="border border-primary/30 bg-card rounded-sm p-6 space-y-4">
                  <h3 className="font-heading font-bold text-lg uppercase">Your Review</h3>
                  {/* Star rating */}
                  <div>
                    <label className="text-xs font-mono text-muted-foreground mb-2 block">RATING</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button key={n} onClick={() => setNewReview(r => ({ ...r, rating: n }))}
                          className={`transition-colors ${n <= newReview.rating ? "text-amber-400" : "text-muted-foreground/30 hover:text-amber-400/60"}`}>
                          <Star className="w-6 h-6 fill-current" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-mono text-muted-foreground mb-2 block">HEADLINE (optional)</label>
                    <input
                      value={newReview.title}
                      onChange={e => setNewReview(r => ({ ...r, title: e.target.value }))}
                      className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary/50"
                      placeholder="Summarise your experience..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-mono text-muted-foreground mb-2 block">REVIEW <span className="text-[#F04444]">*</span></label>
                    <textarea
                      value={newReview.body}
                      onChange={e => setNewReview(r => ({ ...r, body: e.target.value }))}
                      rows={4}
                      className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary/50 resize-none"
                      placeholder="Share your detailed thoughts..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-mono text-muted-foreground mb-2 block">
                      PHOTO URL (optional — earn a 5% discount code!)
                    </label>
                    <div className="flex gap-2">
                      <Camera className="w-4 h-4 text-primary shrink-0 mt-2" />
                      <input
                        value={newReview.photoUrl}
                        onChange={e => setNewReview(r => ({ ...r, photoUrl: e.target.value }))}
                        className="flex-1 bg-background border border-border rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary/50"
                        placeholder="https://... (paste image URL)"
                      />
                    </div>
                    {newReview.photoUrl && (
                      <p className="text-xs text-emerald-400 font-mono mt-1">
                        ✦ Including a photo earns you a 5% discount code!
                      </p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={submitReview}
                      disabled={!newReview.body.trim() || submittingReview}
                      className="px-6 py-2.5 bg-primary text-black font-heading font-bold text-sm uppercase tracking-widest rounded-sm disabled:opacity-50 hover:bg-primary/90 transition-colors"
                    >
                      {submittingReview ? "Submitting..." : "Submit Review"}
                    </button>
                    <button onClick={() => setShowReviewForm(false)} className="px-6 py-2.5 border border-border text-sm font-mono text-muted-foreground hover:text-foreground rounded-sm transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reviews list */}
          {reviewsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-5 border border-border rounded-sm space-y-2 animate-pulse">
                  <div className="h-3 bg-muted rounded w-1/4" />
                  <div className="h-3 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-sm">
              <Star className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="font-mono text-sm text-muted-foreground">No reviews yet — be the first!</p>
              {user && !showReviewForm && (
                <button onClick={() => setShowReviewForm(true)} className="mt-4 font-mono text-xs text-primary hover:underline">Write a review →</button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((r) => {
                const avgStars = r.rating;
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 border border-border bg-card/50 rounded-sm"
                  >
                    <div className="flex items-start gap-3 mb-2 flex-wrap">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(n => (
                          <Star key={n} className={`w-3.5 h-3.5 ${n <= avgStars ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
                        ))}
                      </div>
                      <span className="font-mono font-bold text-sm text-foreground">{r.title || r.reviewer}</span>
                      {r.verified && (
                        <span className="font-mono text-[10px] text-emerald-400 border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">Verified</span>
                      )}
                      <span className="ml-auto font-mono text-xs text-muted-foreground/50">
                        {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                    {r.title && <p className="font-mono text-xs text-muted-foreground mb-1">{r.reviewer}</p>}
                    <p className="text-sm text-muted-foreground leading-relaxed">{r.body}</p>
                    {r.photoUrl && (
                      <div className="mt-3">
                        <img src={r.photoUrl} alt="Review photo" className="max-h-48 rounded-sm object-cover border border-border" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      </div>
                    )}
                    <ReviewVoteButtons reviewId={r.id} initialHelpful={r.helpfulCount} initialUnhelpful={r.unhelpfulCount} />
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="border-t border-border pt-16"
          >
            <div className="flex items-baseline gap-3 mb-8">
              <h2 className="text-3xl font-heading font-bold uppercase tracking-tight">Similar Units</h2>
              <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Same category</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {similarProducts.map((rp, i) => (
                <motion.div
                  key={rp.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  <ProductCard product={rp} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Compatible Hardware */}
        {compatibleProducts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="border-t border-border pt-16"
          >
            <div className="flex items-baseline gap-3 mb-8">
              <h2 className="text-3xl font-heading font-bold uppercase tracking-tight">Compatible Architecture</h2>
              <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Works with this unit</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {compatibleProducts.map((rp, i) => (
                <motion.div
                  key={rp.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  <ProductCard product={rp} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Hold for Me modal */}
      <HoldForMeModal
        open={holdModalOpen}
        onClose={() => setHoldModalOpen(false)}
        productId={product.id}
        productName={product.name}
      />

      {/* Image zoom modal */}
      <AnimatePresence>
        {imageZoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setImageZoomed(false)}
            className="fixed inset-0 z-50 bg-background/90 backdrop-blur-xl flex items-center justify-center p-8 cursor-zoom-out"
          >
            <motion.img
              src={imageUrl}
              alt={product.name}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="max-w-full max-h-full object-contain rounded-sm"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
