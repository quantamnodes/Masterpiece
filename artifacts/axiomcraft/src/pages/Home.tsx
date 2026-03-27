/**
 * Home — AxiomCraft homepage.
 *
 * This file is a pure section orchestrator. All visual logic lives in the
 * section components imported below. To add, remove, or reorder sections,
 * edit only this file.
 *
 * Section order:
 *   1. HeroSection          — full-viewport cinematic opener
 *   2. StatStripSection     — four animated count-up KPIs
 *   3. BentoGridSection     — asymmetric category card grid ("Hardware Matrix")
 *   4. ManifestoStrip       — infinite-scrolling brand slogan marquee
 *   5. FeaturedProductsSection — newest products grid + recently viewed
 *   6. TestimonialsSection  — two-row testimonial + feature marquee carousel
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { HeroSection }             from "@/components/sections/home/HeroSection";
import { StatStripSection }        from "@/components/sections/home/StatStripSection";
import { BentoGridSection }        from "@/components/sections/home/BentoGridSection";
import { ManifestoStrip }          from "@/components/sections/home/ManifestoStrip";
import { FeaturedProductsSection } from "@/components/sections/home/FeaturedProductsSection";
import { TestimonialsSection }     from "@/components/sections/home/TestimonialsSection";

/* ─── PAGE COMPONENT ────────────────────────────────────────────────────── */

export default function Home() {
  const [pastHero, setPastHero] = useState(false);

  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 0.8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <Layout>
      {/* ===== Section 1: Hero ===== */}
      <HeroSection />

      {/* ===== Section 2: KPI Stats ===== */}
      <StatStripSection />

      {/* ===== Section 3: Category Bento Grid ===== */}
      <BentoGridSection />

      {/* ===== Section 4: Scrolling Manifesto ===== */}
      <ManifestoStrip />

      {/* ===== Section 5: Featured Products + Recently Viewed ===== */}
      <FeaturedProductsSection />

      {/* ===== Section 6: Testimonials + Feature Highlights Carousel ===== */}
      <TestimonialsSection />

      {/* ===== Back to Top ===== */}
      <AnimatePresence>
        {pastHero && (
          <motion.button
            key="back-to-top"
            onClick={scrollToTop}
            initial={{ opacity: 0, y: 16, scale: 0.85 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{    opacity: 0, y: 16, scale: 0.85 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            aria-label="Back to top"
            className="fixed bottom-8 right-8 z-50 flex items-center justify-center w-11 h-11 rounded-sm border border-primary/40 bg-background/80 backdrop-blur-sm text-primary shadow-[0_0_20px_rgba(0,240,255,0.15)] hover:border-primary hover:shadow-[0_0_28px_rgba(0,240,255,0.35)] hover:bg-primary/10 transition-all duration-200"
          >
            <ArrowUp className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </Layout>
  );
}
