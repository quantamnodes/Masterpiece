import { Link } from "react-router-dom";
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  useMotionValue,
  useSpring,
  AnimatePresence,
} from "framer-motion";
import { Cpu, Zap, Shield, ArrowRight, ChevronRight, Microchip } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { useListProducts } from "@workspace/api-client-react";
import { ProductCard, ProductCardSkeleton } from "@/components/ProductCard";
import { useEffect, useRef, useState } from "react";

function CountUpStat({ target, suffix, label, delay = 0 }: { target: number; suffix: string; label: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const t = setTimeout(() => {
      const duration = 1800;
      const steps = 60;
      const increment = target / steps;
      let current = 0;
      const timer = setInterval(() => {
        current = Math.min(current + increment, target);
        setCount(Math.floor(current));
        if (current >= target) clearInterval(timer);
      }, duration / steps);
    }, delay);
    return () => clearTimeout(t);
  }, [isInView, target, delay]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: delay / 1000 }}
      className="text-center px-4"
    >
      <div className="text-3xl md:text-4xl font-mono font-bold text-foreground mb-2">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-xs font-heading uppercase tracking-widest text-muted-foreground">{label}</div>
    </motion.div>
  );
}

function ScanLine() {
  return (
    <motion.div
      className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent pointer-events-none z-20"
      animate={{ top: ["0%", "100%", "0%"] }}
      transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
    />
  );
}

function FloatingOrb({ x, y, size, delay }: { x: string; y: string; size: number; delay: number }) {
  return (
    <motion.div
      className="absolute rounded-full bg-primary/10 blur-3xl pointer-events-none"
      style={{ left: x, top: y, width: size, height: size }}
      animate={{
        scale: [1, 1.3, 1],
        opacity: [0.3, 0.6, 0.3],
      }}
      transition={{ duration: 5 + delay, repeat: Infinity, delay, ease: "easeInOut" }}
    />
  );
}

const heroWords = ["Architecture", "of", "Tomorrow."];

export default function Home() {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const bgOpacity = useTransform(scrollYProgress, [0, 0.8], [0.35, 0]);
  const headingY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 60, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 20 });

  const bentoRef = useRef(null);
  const featuredRef = useRef(null);

  const { data: featuredData, isLoading } = useListProducts({ sortBy: "newest" });

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left - rect.width / 2) * 0.02);
    mouseY.set((e.clientY - rect.top - rect.height / 2) * 0.02);
  };

  return (
    <Layout>
      {/* ─── HERO ─────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative min-h-[100vh] flex items-center pt-20 overflow-hidden"
        onMouseMove={handleMouseMove}
      >
        {/* Parallax BG */}
        <motion.div style={{ y: bgY }} className="absolute inset-0 z-0">
          <motion.img
            style={{ opacity: bgOpacity }}
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`}
            alt=""
            className="w-full h-full object-cover mix-blend-screen"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        </motion.div>

        {/* Floating orbs */}
        <FloatingOrb x="10%" y="20%" size={400} delay={0} />
        <FloatingOrb x="70%" y="60%" size={300} delay={2} />
        <FloatingOrb x="85%" y="10%" size={200} delay={1.5} />

        {/* Scan line */}
        <ScanLine />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,240,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.03) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <motion.div style={{ y: headingY }}>
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3 py-1 border border-primary/30 bg-primary/5 rounded-sm mb-10"
            >
              <motion.div
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Zap className="w-4 h-4 text-primary" />
              </motion.div>
              <span className="text-xs font-mono tracking-widest text-primary uppercase">
                Next-Gen Architecture Available
              </span>
            </motion.div>

            {/* Animated headline word-by-word */}
            <h1 className="text-5xl sm:text-7xl md:text-[7rem] font-heading font-bold uppercase leading-[0.88] tracking-tighter mb-8">
              {heroWords.map((word, wi) => (
                <span key={wi} className="inline-block overflow-hidden mr-4">
                  <motion.span
                    className={`inline-block ${wi === 2 ? "text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-300 to-blue-500" : ""}`}
                    initial={{ y: "110%", opacity: 0 }}
                    animate={{ y: "0%", opacity: 1 }}
                    transition={{
                      duration: 0.7,
                      delay: 0.3 + wi * 0.15,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    {word}
                  </motion.span>
                </span>
              ))}
            </h1>

            {/* Sub-line */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.75 }}
              className="text-xl md:text-2xl text-muted-foreground font-sans max-w-2xl mb-12 border-l-2 border-primary pl-6"
            >
              Engineered for those who refuse compromise. Absolute power. Zero bottlenecks. Render at the speed of thought.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="flex flex-wrap gap-4"
            >
              <Link to="/products">
                <motion.button
                  whileHover={{ scale: 1.04, boxShadow: "0 0 30px rgba(0,240,255,0.4)" }}
                  whileTap={{ scale: 0.97 }}
                  style={{ x: springX, y: springY }}
                  className="px-8 py-4 bg-primary text-primary-foreground font-heading font-bold uppercase tracking-wider text-sm rounded-sm transition-colors flex items-center gap-2 group"
                >
                  Initialize Setup
                  <motion.span
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </motion.span>
                </motion.button>
              </Link>
              <Link to="/products?category=gpus">
                <motion.button
                  whileHover={{ scale: 1.04, borderColor: "rgba(0,240,255,0.8)", color: "rgb(0,240,255)" }}
                  whileTap={{ scale: 0.97 }}
                  className="px-8 py-4 bg-transparent border border-border text-foreground font-heading font-bold uppercase tracking-wider text-sm rounded-sm transition-colors"
                >
                  Explore GPUs
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-px h-10 bg-gradient-to-b from-transparent to-primary" />
          <span className="text-xs font-mono text-primary/60 uppercase tracking-widest">Scroll</span>
        </motion.div>
      </section>

      {/* ─── STAT STRIP ──────────────────────────────────────────────── */}
      <section className="border-y border-border bg-card/50 backdrop-blur-md relative z-20 overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5"
          animate={{ backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-border/50">
            <CountUpStat target={50000} suffix="+" label="Units Deployed" delay={0} />
            <CountUpStat target={999} suffix="%" label="Uptime Reliability" delay={100} />
            <CountUpStat target={247} suffix="" label="Protocol Support" delay={200} />
            <CountUpStat target={5} suffix="-Year" label="Hardware Warranty" delay={300} />
          </div>
        </div>
      </section>

      {/* ─── BENTO GRID ──────────────────────────────────────────────── */}
      <section ref={bentoRef} className="py-24 relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-5xl font-heading font-bold uppercase tracking-tight mb-2">Hardware Matrix</h2>
              <p className="text-muted-foreground font-mono">SELECT COMPONENT PROTOCOL</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Link to="/products" className="hidden md:flex items-center gap-2 text-primary font-mono text-sm hover:underline">
                VIEW ALL <ChevronRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[300px]">
            {[
              { to: "/products?category=gpus", span: "md:col-span-2 md:row-span-2", img: `${import.meta.env.BASE_URL}images/category-gpu.png`, title: "Graphics Processors", sub: "Visual simulation rendering engines.", big: true },
              { to: "/products?category=cpus", span: "", img: `${import.meta.env.BASE_URL}images/category-cpu.png`, title: "Logic Cores", sub: "Central processing units.", big: false },
              { to: "/products?category=motherboards", span: "", img: null, title: "Mainboards", sub: "System foundations.", big: false },
            ].map((cell, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40, scale: 0.96 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                className={cell.span}
              >
                <Link
                  to={cell.to}
                  className="block w-full h-full relative group overflow-hidden border border-border rounded-sm bg-card hover:border-primary/60 transition-colors"
                >
                  {cell.img ? (
                    <motion.img
                      src={cell.img}
                      alt={cell.title}
                      className="absolute inset-0 w-full h-full object-cover mix-blend-luminosity group-hover:mix-blend-normal opacity-60 transition-all duration-700"
                      whileHover={{ scale: 1.07 }}
                      transition={{ duration: 0.7 }}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,240,255,0.1),transparent_70%)] group-hover:bg-[radial-gradient(circle_at_top_right,rgba(0,240,255,0.2),transparent_70%)] transition-all" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                  <motion.div
                    className="absolute bottom-6 left-6"
                    initial={{ y: 10, opacity: 0.8 }}
                    whileHover={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    {!cell.img && <Shield className="w-8 h-8 text-muted-foreground mb-3 group-hover:text-primary transition-colors" />}
                    <h3 className={`${cell.big ? "text-4xl" : "text-2xl"} font-heading font-bold uppercase mb-1 group-hover:text-primary transition-colors`}>
                      {cell.title}
                    </h3>
                    <p className="text-muted-foreground font-mono text-xs">{cell.sub}</p>
                  </motion.div>
                  <motion.div
                    className="absolute top-4 right-4 w-6 h-6 border border-primary/0 group-hover:border-primary/50 rounded-sm transition-colors"
                    whileHover={{ rotate: 90 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChevronRight className="w-4 h-4 text-primary/0 group-hover:text-primary/80 m-0.5 transition-colors" />
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── MANIFESTO STRIP ─────────────────────────────────────────── */}
      <section className="py-16 border-y border-border overflow-hidden">
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="flex gap-12 whitespace-nowrap"
        >
          {Array(4).fill(["ZERO BOTTLENECKS", "ABSOLUTE POWER", "ENGINEERED PRECISION", "MAXIMUM THROUGHPUT", "RENDER AT LIGHT SPEED"]).flat().map((t, i) => (
            <span key={i} className="font-heading font-bold text-2xl uppercase tracking-widest text-muted-foreground/20 hover:text-primary/40 transition-colors">
              {t} <span className="text-primary/20 mx-6">◆</span>
            </span>
          ))}
        </motion.div>
      </section>

      {/* ─── FEATURED PRODUCTS (horizontal scroll strip) ─────────────── */}
      <section ref={featuredRef} className="py-24 bg-card/20 border-y border-border relative z-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex items-end justify-between"
          >
            <div>
              <h2 className="text-3xl md:text-4xl font-heading font-bold uppercase tracking-tight mb-2">New Acquisitions</h2>
              <div className="h-[2px] w-20 bg-gradient-to-r from-primary to-transparent" />
            </div>
            <Link to="/products" className="hidden md:flex items-center gap-2 text-primary font-mono text-sm hover:underline">
              VIEW ALL <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>

        <div className="px-4 sm:px-6 lg:px-8 overflow-x-auto scrollbar-hide">
          <div className="flex gap-6 pb-4" style={{ width: "max-content" }}>
            {isLoading
              ? Array(6).fill(0).map((_, i) => (
                  <div key={i} className="w-72 shrink-0">
                    <ProductCardSkeleton />
                  </div>
                ))
              : featuredData?.products.slice(0, 8).map((product, i) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, x: 40 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.5, delay: i * 0.07 }}
                    className="w-72 shrink-0"
                  >
                    <ProductCard product={product} />
                  </motion.div>
                ))}
          </div>
        </div>
      </section>

      {/* ─── VALUE PROPS ─────────────────────────────────────────────── */}
      <section className="py-24 relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-5xl font-heading font-bold uppercase tracking-tight mb-16 text-center"
          >
            Why <span className="text-primary">AxiomCraft</span>
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Zap, title: "Zero-Latency Design", body: "Every component validated under extreme workloads. Clock speeds, thermals, and power delivery tuned beyond factory spec." },
              { icon: Shield, title: "5-Year Assurance", body: "Full replacement warranty backed by our own engineering team. No third-party logistics, no runaround." },
              { icon: Cpu, title: "Lifetime Support", body: "One-on-one configuration support from the engineers who built your system. Available around the clock." },
            ].map((vp, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                whileHover={{ y: -6 }}
                className="group border border-border bg-card/50 rounded-sm p-8 relative overflow-hidden hover:border-primary/40 transition-colors"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100"
                  transition={{ duration: 0.3 }}
                />
                <motion.div
                  whileHover={{ rotate: 15, scale: 1.1 }}
                  transition={{ duration: 0.3 }}
                  className="w-12 h-12 bg-primary/10 border border-primary/30 flex items-center justify-center rounded-sm mb-6 group-hover:border-primary transition-colors"
                >
                  <vp.icon className="w-6 h-6 text-primary" />
                </motion.div>
                <h3 className="text-xl font-heading font-bold uppercase mb-3 group-hover:text-primary transition-colors">{vp.title}</h3>
                <p className="text-muted-foreground font-sans leading-relaxed text-sm">{vp.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
