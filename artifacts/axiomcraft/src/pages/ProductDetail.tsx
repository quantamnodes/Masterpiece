import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { useGetProduct } from "@workspace/api-client-react";
import { type Product } from "@workspace/api-client-react";
import { useCartManager } from "@/hooks/use-cart-manager";
import { ProductCard } from "@/components/ProductCard";
import { WishlistButton } from "@/components/WishlistButton";
import { ShoppingCart, ChevronLeft, ShieldCheck, Truck, Cpu, Zap, Bell, BellRing, CheckCircle2 } from "lucide-react";
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
  }, [productId, user?.email]);

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
            </motion.div>
          </motion.div>
        </div>

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
