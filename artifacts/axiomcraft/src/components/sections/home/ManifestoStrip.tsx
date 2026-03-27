/**
 * ManifestoStrip — a full-width infinite scrolling text marquee with brand
 * slogans, separating the Bento Grid from the Featured Products section.
 *
 * Uses the global `.marquee-ltr` CSS animation defined in `index.css`.
 * Speed is controlled by the `--marquee-speed` CSS custom property.
 * Pauses on hover via `.marquee-track:hover .marquee-ltr` rule in CSS.
 *
 * Self-contained: copy this file + the marquee classes from index.css and
 * the component works in any React + Tailwind project (no extra libs needed).
 */

/* ─── COPY ──────────────────────────────────────────────────────────────── */
const MANIFESTO_PHRASES = [
  "ZERO BOTTLENECKS",
  "ABSOLUTE POWER",
  "ENGINEERED PRECISION",
  "MAXIMUM THROUGHPUT",
  "RENDER AT LIGHT SPEED",
];

/* Duplicate the array so the seamless CSS loop has enough content */
const MARQUEE_ITEMS = [...MANIFESTO_PHRASES, ...MANIFESTO_PHRASES];

/* ─── MAIN EXPORT ────────────────────────────────────────────────────────── */

export function ManifestoStrip() {
  return (
    /* ===== Manifesto Strip Section Start ===== */
    <section className="manifesto-strip-section">
      {/* `.marquee-track` enables the hover-pause CSS rule */}
      <div className="manifesto-marquee-track marquee-track">
        {/* `.marquee-ltr` drives the left-to-right continuous scroll */}
        <div className="marquee-ltr manifesto-marquee-inner">
          {MARQUEE_ITEMS.map((phrase, index) => (
            /* ===== Manifesto Phrase Start ===== */
            <span key={index} className="manifesto-phrase">
              {phrase}
              <span className="manifesto-phrase-separator" aria-hidden="true">
                ✦
              </span>
            </span>
            /* ===== Manifesto Phrase End ===== */
          ))}
        </div>
      </div>
    </section>
    /* ===== Manifesto Strip Section End ===== */
  );
}
