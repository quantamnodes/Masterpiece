/**
 * FeaturedProductsSection — "New Acquisitions" 3-column product grid.
 *
 * Fetches the 9 newest products and renders them with `ProductCard`.
 * Falls back to `ProductCardSkeleton` while loading.
 * Includes a header with a "View All" link and a section anchor for
 * recently viewed tracking (handled by ProductDetail on navigation).
 *
 * Self-contained: copy this file + ProductCard and the section works in
 * any React + TanStack Query project with the same API shape.
 */

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useListProducts } from "@workspace/api-client-react";
import { ProductCard, ProductCardSkeleton } from "@/components/ProductCard";
import { RecentlyViewedCarousel } from "@/components/RecentlyViewedCarousel";

/* ─── MAIN EXPORT ────────────────────────────────────────────────────────── */

export function FeaturedProductsSection() {
  const { data: productsData, isLoading } = useListProducts({ sortBy: "newest" });

  /* Limit to 9 products for the homepage grid */
  const featuredProducts = productsData?.products?.slice(0, 9) ?? [];

  return (
    /* ===== Featured Products Section Start ===== */
    <section className="featured-products-section">
      <div className="page-container">

        {/* ── Section Header ── */}
        <div className="featured-products-header">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="section-heading">New Acquisitions</h2>
            <p className="section-subheading">LATEST HARDWARE DROPS</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Link to="/products" className="featured-products-view-all-link">
              VIEW ALL <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>

        {/* ── Product Grid — 3 columns, skeleton while loading ── */}
        <div className="featured-products-grid">
          {isLoading
            ? Array(6)
                .fill(0)
                .map((_, i) => <ProductCardSkeleton key={i} />)
            : featuredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{
                    duration: 0.5,
                    delay: (index % 3) * 0.1,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <ProductCard product={product} fillContainer />
                </motion.div>
              ))}
        </div>

        {/* ── Recently Viewed Carousel (shown when history exists) ── */}
        <RecentlyViewedCarousel />

      </div>
    </section>
    /* ===== Featured Products Section End ===== */
  );
}
