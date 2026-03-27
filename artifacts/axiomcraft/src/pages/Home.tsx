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

import { Layout } from "@/components/layout/Layout";
import { HeroSection }             from "@/components/sections/home/HeroSection";
import { StatStripSection }        from "@/components/sections/home/StatStripSection";
import { BentoGridSection }        from "@/components/sections/home/BentoGridSection";
import { ManifestoStrip }          from "@/components/sections/home/ManifestoStrip";
import { FeaturedProductsSection } from "@/components/sections/home/FeaturedProductsSection";
import { TestimonialsSection }     from "@/components/sections/home/TestimonialsSection";

/* ─── PAGE COMPONENT ────────────────────────────────────────────────────── */

export default function Home() {
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
    </Layout>
  );
}
