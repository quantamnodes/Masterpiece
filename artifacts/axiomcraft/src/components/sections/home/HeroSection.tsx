/**
 * HeroSection — full-viewport cinematic opener for the AxiomCraft homepage.
 *
 * Responsibilities:
 *  - Parallax background image that fades on scroll
 *  - Three floating ambient orbs (pulsing blur circles)
 *  - Horizontal cyan scan line that loops vertically
 *  - Cyan pixel-grid overlay
 *  - Word-by-word animated headline
 *  - Subtitle with left border accent
 *  - Two CTA buttons with mouse-tracking spring on primary
 *  - Scroll indicator that pulses at the bottom
 *
 * Self-contained: copy this file + its CSS classes from index.css and the
 * component works in any React + Framer Motion + Tailwind project.
 */

import { Link } from "react-router-dom";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
} from "framer-motion";
import { Zap, ArrowRight } from "lucide-react";
import { useRef } from "react";

/* ─── HERO COPY ─────────────────────────────────────────────────────────── */
const HERO_HEADLINE_WORDS = ["Architecture", "of", "Tomorrow."];
const HERO_BADGE_TEXT = "Next-Gen Architecture Available";
const HERO_SUBLINE =
  "Engineered for those who refuse compromise. Absolute power. Zero bottlenecks. Render at the speed of thought.";

/* ─── SUB-COMPONENTS ────────────────────────────────────────────────────── */

/** Animated horizontal scan line that travels top→bottom on loop */
function HeroScanLine() {
  return (
    /* ===== Scan Line Start ===== */
    <motion.div
      className="hero-scan-line"
      animate={{ top: ["0%", "100%", "0%"] }}
      transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
    />
    /* ===== Scan Line End ===== */
  );
}

/** Pulsing ambient glow orb — purely decorative background element */
function HeroAmbientOrb({
  left,
  top,
  size,
  animDelay,
}: {
  left: string;
  top: string;
  size: number;
  animDelay: number;
}) {
  return (
    /* ===== Ambient Orb Start ===== */
    <motion.div
      className="hero-ambient-orb"
      style={{ left, top, width: size, height: size }}
      animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
      transition={{
        duration: 5 + animDelay,
        repeat: Infinity,
        delay: animDelay,
        ease: "easeInOut",
      }}
    />
    /* ===== Ambient Orb End ===== */
  );
}

/* ─── MAIN EXPORT ────────────────────────────────────────────────────────── */

export function HeroSection() {
  /* ── Scroll-linked parallax refs ── */
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const bgParallaxY      = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const bgParallaxOpacity = useTransform(scrollYProgress, [0, 0.8], [0.35, 0]);
  const headlineParallaxY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  /* ── Mouse-spring for primary CTA button ── */
  const rawMouseX = useMotionValue(0);
  const rawMouseY = useMotionValue(0);
  const springX = useSpring(rawMouseX, { stiffness: 60, damping: 20 });
  const springY = useSpring(rawMouseY, { stiffness: 60, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    rawMouseX.set((e.clientX - rect.left - rect.width / 2) * 0.02);
    rawMouseY.set((e.clientY - rect.top - rect.height / 2) * 0.02);
  };

  return (
    /* ===== Hero Section Start ===== */
    <section
      ref={sectionRef}
      className="hero-section"
      onMouseMove={handleMouseMove}
    >
      {/* ── Parallax Background Image ── */}
      <motion.div style={{ y: bgParallaxY }} className="hero-bg-layer">
        <motion.img
          style={{ opacity: bgParallaxOpacity }}
          src={`${import.meta.env.BASE_URL}images/hero-bg.png`}
          alt=""
          className="hero-bg-image"
        />
        <div className="hero-bg-gradient-fade" />
      </motion.div>

      {/* ── Ambient Glow Orbs ── */}
      <HeroAmbientOrb left="10%" top="20%" size={400} animDelay={0} />
      <HeroAmbientOrb left="70%" top="60%" size={300} animDelay={2} />
      <HeroAmbientOrb left="85%" top="10%" size={200} animDelay={1.5} />

      {/* ── Vertical Scan Line ── */}
      <HeroScanLine />

      {/* ── Cyan Pixel Grid Overlay ── */}
      <div className="hero-grid-overlay" />

      {/* ── Main Content Column ── */}
      <div className="page-container relative z-10 w-full">
        <motion.div style={{ y: headlineParallaxY }}>

          {/* ── Live Status Badge ── */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="hero-status-badge"
          >
            <motion.div
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Zap className="w-4 h-4 text-primary" />
            </motion.div>
            <span className="hero-status-badge-text">{HERO_BADGE_TEXT}</span>
          </motion.div>

          {/* ── Animated Headline (word by word) ── */}
          <h1 className="hero-headline">
            {HERO_HEADLINE_WORDS.map((word, index) => (
              <span key={index} className="hero-headline-word-wrapper">
                <motion.span
                  className={
                    index === 2
                      ? "hero-headline-word hero-headline-word--accent"
                      : "hero-headline-word"
                  }
                  initial={{ y: "110%", opacity: 0 }}
                  animate={{ y: "0%", opacity: 1 }}
                  transition={{
                    duration: 0.7,
                    delay: 0.3 + index * 0.15,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {word}
                </motion.span>
              </span>
            ))}
          </h1>

          {/* ── Sub-headline ── */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.75 }}
            className="hero-subline"
          >
            {HERO_SUBLINE}
          </motion.p>

          {/* ── Call-to-Action Buttons ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="hero-cta-group"
          >
            {/* Primary CTA — mouse-tracking spring effect */}
            <Link to="/products">
              <motion.button
                whileHover={{
                  scale: 1.04,
                  boxShadow: "0 0 30px rgba(0,240,255,0.4)",
                }}
                whileTap={{ scale: 0.97 }}
                style={{ x: springX, y: springY }}
                className="btn-primary"
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

            {/* Secondary CTA — ghost button */}
            <Link to="/products?category=gpus">
              <motion.button
                whileHover={{
                  scale: 1.04,
                  borderColor: "rgba(0,240,255,0.8)",
                  color: "rgb(0,240,255)",
                }}
                whileTap={{ scale: 0.97 }}
                className="btn-ghost"
              >
                Explore GPUs
              </motion.button>
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* ── Scroll Indicator (pulsing vertical line + label) ── */}
      <motion.div
        className="hero-scroll-indicator"
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="hero-scroll-indicator-line" />
        <span className="hero-scroll-indicator-label">Scroll</span>
      </motion.div>
    </section>
    /* ===== Hero Section End ===== */
  );
}
