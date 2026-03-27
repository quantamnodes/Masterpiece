/**
 * BentoGridSection — asymmetric 3-cell category card grid ("Hardware Matrix").
 *
 * Layout:
 *  - GPUs card spans 2 columns × 2 rows (featured, large image)
 *  - CPUs card is 1×1 with a product image
 *  - Motherboards card is 1×1 with a radial gradient placeholder
 *
 * Each card:
 *  - Animates in from below on first scroll into view
 *  - Image blends luminosity at rest, full color on hover
 *  - Hover reveals a chevron icon in the top-right corner
 *
 * Self-contained: copy this file + the .bento-* CSS classes and the
 * component works in any React + Framer Motion + Tailwind project.
 */

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, ChevronRight } from "lucide-react";

/* ─── GRID DATA ─────────────────────────────────────────────────────────── */
const BENTO_CELLS = [
  {
    to: "/products?category=gpus",
    gridSpan: "md:col-span-2 md:row-span-2",
    imageSrc: `${import.meta.env.BASE_URL}images/category-gpu.png`,
    title: "Graphics Processors",
    subtitle: "Visual simulation rendering engines.",
    isFeatured: true,
  },
  {
    to: "/products?category=cpus",
    gridSpan: "",
    imageSrc: `${import.meta.env.BASE_URL}images/category-cpu.png`,
    title: "Logic Cores",
    subtitle: "Central processing units.",
    isFeatured: false,
  },
  {
    to: "/products?category=motherboards",
    gridSpan: "",
    imageSrc: null,
    title: "Mainboards",
    subtitle: "System foundations.",
    isFeatured: false,
  },
];

/* ─── MAIN EXPORT ────────────────────────────────────────────────────────── */

export function BentoGridSection() {
  return (
    /* ===== Bento Grid Section Start ===== */
    <section className="bento-grid-section">
      <div className="page-container">

        {/* ── Section Header ── */}
        <div className="bento-grid-header">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="section-heading">Hardware Matrix</h2>
            <p className="section-subheading">SELECT COMPONENT PROTOCOL</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Link to="/products" className="bento-grid-view-all-link">
              VIEW ALL <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>

        {/* ── Asymmetric Card Grid ── */}
        <div className="bento-grid">
          {BENTO_CELLS.map((cell, index) => (
            /* ===== Bento Cell Start ===== */
            <motion.div
              key={cell.to}
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.6,
                delay: index * 0.12,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={cell.gridSpan}
            >
              <Link to={cell.to} className="bento-card group">

                {/* Image or gradient placeholder */}
                {cell.imageSrc ? (
                  <motion.img
                    src={cell.imageSrc}
                    alt={cell.title}
                    className="bento-card-image"
                    whileHover={{ scale: 1.07 }}
                    transition={{ duration: 0.7 }}
                  />
                ) : (
                  <div className="bento-card-gradient-placeholder" />
                )}

                {/* Gradient overlay — ensures text legibility */}
                <div className="bento-card-overlay" />

                {/* Text content anchored bottom-left */}
                <motion.div
                  className="bento-card-content"
                  initial={{ y: 10, opacity: 0.8 }}
                  whileHover={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Fallback icon when no image */}
                  {!cell.imageSrc && (
                    <Shield className="bento-card-icon" />
                  )}
                  <h3
                    className={
                      cell.isFeatured
                        ? "bento-card-title bento-card-title--large"
                        : "bento-card-title"
                    }
                  >
                    {cell.title}
                  </h3>
                  <p className="bento-card-subtitle">{cell.subtitle}</p>
                </motion.div>

                {/* Corner chevron — appears on hover */}
                <motion.div
                  className="bento-card-corner-indicator"
                  whileHover={{ rotate: 90 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronRight className="bento-card-corner-icon" />
                </motion.div>

              </Link>
            </motion.div>
            /* ===== Bento Cell End ===== */
          ))}
        </div>

      </div>
    </section>
    /* ===== Bento Grid Section End ===== */
  );
}
