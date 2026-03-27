/**
 * StatStripSection — four animated count-up statistics displayed in a
 * horizontal band between the Hero and the Bento Grid.
 *
 * Each StatCounter:
 *  - Triggers once when scrolled into view (Framer Motion viewport)
 *  - Counts from 0 up to `target` over ~1.8 s using an interval
 *  - Accepts an optional `delay` (ms) so the four stats stagger their start
 *
 * Self-contained: copy this file + CountUpStat and it works in any
 * React + Framer Motion + Tailwind project.
 */

import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/* ─── STAT DATA ─────────────────────────────────────────────────────────── */
const STATS = [
  { target: 50000, suffix: "+", label: "Units Deployed",    delay: 0 },
  { target: 999,   suffix: "%", label: "Uptime Reliability", delay: 100 },
  { target: 247,   suffix: "",  label: "Protocol Support",   delay: 200 },
  { target: 5,     suffix: "-Year", label: "Hardware Warranty", delay: 300 },
];

/* ─── SUB-COMPONENTS ────────────────────────────────────────────────────── */

/**
 * CountUpStat — single animated statistic.
 *
 * Props:
 *  - target  — final numeric value to count up to
 *  - suffix  — string appended after the number (e.g. "+", "%", "-Year")
 *  - label   — descriptor shown beneath the number
 *  - delay   — ms to wait after entering the viewport before counting starts
 */
function CountUpStat({
  target,
  suffix,
  label,
  delay = 0,
}: {
  target: number;
  suffix: string;
  label: string;
  delay?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-50px" });
  const [count, setCount] = useState(0);

  /* Starts counting when the element enters the viewport */
  useEffect(() => {
    if (!isInView) return;
    const startTimer = setTimeout(() => {
      const DURATION_MS = 1800;
      const STEPS = 60;
      const increment = target / STEPS;
      let current = 0;

      const countTimer = setInterval(() => {
        current = Math.min(current + increment, target);
        setCount(Math.floor(current));
        if (current >= target) clearInterval(countTimer);
      }, DURATION_MS / STEPS);
    }, delay);

    return () => clearTimeout(startTimer);
  }, [isInView, target, delay]);

  return (
    /* ===== Count-Up Stat Start ===== */
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: delay / 1000 }}
      className="stat-item"
    >
      <div className="stat-value">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="stat-label">{label}</div>
    </motion.div>
    /* ===== Count-Up Stat End ===== */
  );
}

/* ─── MAIN EXPORT ────────────────────────────────────────────────────────── */

export function StatStripSection() {
  return (
    /* ===== Stat Strip Section Start ===== */
    <section className="stat-strip-section">
      {/* Animated ambient gradient sweep */}
      <motion.div
        className="stat-strip-gradient-sweep"
        animate={{ backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />

      {/* Stat grid — 2 columns on mobile, 4 on desktop */}
      <div className="page-container py-12">
        <div className="stat-strip-grid">
          {STATS.map((stat) => (
            <CountUpStat key={stat.label} {...stat} />
          ))}
        </div>
      </div>
    </section>
    /* ===== Stat Strip Section End ===== */
  );
}
