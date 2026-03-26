import { Link } from "wouter";
import { motion, useScroll, useTransform } from "framer-motion";
import { Cpu, Zap, Shield, ArrowRight, ChevronRight } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { useListProducts } from "@workspace/api-client-react";
import { ProductCard, ProductCardSkeleton } from "@/components/ProductCard";

export default function Home() {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);

  const { data: featuredData, isLoading } = useListProducts({ sortBy: "newest" });

  const stats = [
    { value: "50,000+", label: "Units Deployed" },
    { value: "99.9%", label: "Uptime Reliability" },
    { value: "24/7", label: "Protocol Support" },
    { value: "5-Year", label: "Hardware Warranty" },
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center pt-12 overflow-hidden">
        <motion.div style={{ y }} className="absolute inset-0 z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`}
            alt="Futuristic Tech Architecture"
            className="w-full h-full object-cover opacity-30 mix-blend-screen"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 border border-primary/30 bg-primary/5 rounded-sm mb-8">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-xs font-mono tracking-widest text-primary uppercase">Next-Gen Architecture Available</span>
              </div>
              <h1 className="text-5xl sm:text-6xl md:text-8xl font-heading font-bold uppercase leading-[0.9] tracking-tighter mb-6">
                Architecture of <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600 text-glow">Tomorrow.</span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground font-sans max-w-2xl mb-10 border-l-2 border-primary pl-6">
                Engineered for those who refuse compromise. Absolute power. Zero bottlenecks. Render at the speed of thought.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Link href="/products">
                  <button className="px-8 py-4 bg-primary text-primary-foreground font-heading font-bold uppercase tracking-wider text-sm rounded-sm hover:bg-primary/90 transition-all box-glow flex items-center gap-2 group">
                    Initialize Setup <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
                <Link href="/products?category=gpus">
                  <button className="px-8 py-4 bg-background border border-border text-foreground font-heading font-bold uppercase tracking-wider text-sm rounded-sm hover:border-primary hover:text-primary transition-all">
                    Explore GPUs
                  </button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stat Strip */}
      <section className="border-y border-border bg-card/50 backdrop-blur-md relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-border/50">
            {stats.map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center px-4"
              >
                <div className="text-3xl md:text-4xl font-mono font-bold text-foreground mb-2">{stat.value}</div>
                <div className="text-xs font-heading uppercase tracking-widest text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bento Grid Categories */}
      <section className="py-24 relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-5xl font-heading font-bold uppercase tracking-tight mb-4">Hardware Matrix</h2>
              <p className="text-muted-foreground font-mono">SELECT COMPONENT PROTOCOL</p>
            </div>
            <Link href="/products" className="hidden md:flex items-center gap-2 text-primary font-mono text-sm hover:underline">
              VIEW ALL <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[300px]">
            {/* Main large cell */}
            <Link href="/products?category=gpus" className="md:col-span-2 md:row-span-2 relative group overflow-hidden border border-border rounded-sm bg-card hover:border-primary/50 transition-colors">
              <img 
                src={`${import.meta.env.BASE_URL}images/category-gpu.png`}
                alt="GPUs"
                className="absolute inset-0 w-full h-full object-cover mix-blend-luminosity group-hover:mix-blend-normal opacity-60 transition-all duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
              <div className="absolute bottom-8 left-8">
                <h3 className="text-4xl font-heading font-bold uppercase mb-2 group-hover:text-primary transition-colors">Graphics Processors</h3>
                <p className="text-muted-foreground font-mono text-sm">Visual simulation rendering engines.</p>
              </div>
            </Link>

            {/* Smaller cells */}
            <Link href="/products?category=cpus" className="relative group overflow-hidden border border-border rounded-sm bg-card hover:border-primary/50 transition-colors">
              <img 
                src={`${import.meta.env.BASE_URL}images/category-cpu.png`}
                alt="CPUs"
                className="absolute inset-0 w-full h-full object-cover mix-blend-luminosity group-hover:mix-blend-normal opacity-50 transition-all duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
              <div className="absolute bottom-6 left-6">
                <h3 className="text-2xl font-heading font-bold uppercase mb-1 group-hover:text-primary transition-colors">Logic Cores</h3>
                <p className="text-muted-foreground font-mono text-xs">Central processing units.</p>
              </div>
            </Link>

            <Link href="/products?category=motherboards" className="relative group overflow-hidden border border-border rounded-sm bg-card hover:border-primary/50 transition-colors p-6 flex flex-col justify-end">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,240,255,0.1),transparent_70%)]" />
              <Shield className="w-8 h-8 text-muted-foreground mb-4 group-hover:text-primary transition-colors" />
              <h3 className="text-2xl font-heading font-bold uppercase mb-1 group-hover:text-primary transition-colors">Mainboards</h3>
              <p className="text-muted-foreground font-mono text-xs">System foundations.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-24 bg-card/30 border-y border-border relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-heading font-bold uppercase tracking-tight mb-2">New Acquisitions</h2>
            <div className="h-1 w-20 bg-primary" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {isLoading 
              ? Array(4).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)
              : featuredData?.products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))
            }
          </div>
        </div>
      </section>
    </Layout>
  );
}
