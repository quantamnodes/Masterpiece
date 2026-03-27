/**
 * TestimonialsSection — two-row infinite scrolling marquee carousel.
 *
 * Row 1 (left-to-right): Customer testimonials — `TestimonialCard`
 * Row 2 (right-to-left): Platform upgrade feature highlights — `UpgradeCard`
 *
 * Both rows pause on hover via the `.marquee-track` CSS rule.
 * Speed is set per-row via the `--marquee-speed` CSS custom property.
 *
 * Architecture:
 *   TestimonialsSection
 *     └── MarqueeRow (direction=ltr, speed=90s) → TestimonialCard × N
 *     └── MarqueeRow (direction=rtl, speed=75s) → UpgradeCard × N
 *
 * Self-contained: copy this file + the marquee CSS from index.css.
 */

import { Zap, Shield } from "lucide-react";
import type { ReactNode } from "react";

/* ─── DATA ──────────────────────────────────────────────────────────────── */

const TESTIMONIALS = [
  { name: "DR_APEX",       tier: "Platinum", rating: 5, text: "The X870E Apex is a beast. Running AM5 at 6.4GHz all-core with thermals that don't flinch. Zero instability in 4 months of 24/7 operation." },
  { name: "VECTORFIELD_77", tier: "Gold",    rating: 5, text: "Switched from another vendor — the difference is night and day. Support team had my RMA processed in 6 hours. Unmatched service." },
  { name: "NULL_POINTER",  tier: "Silver",   rating: 5, text: "RTX 5090 FE edition ran out of stock everywhere else. AxiomCraft had it in hand and shipped same day. My render times halved immediately." },
  { name: "SIGMA_BUILD",   tier: "Platinum", rating: 5, text: "The PC Builder tool actually saved me from a compatibility nightmare. Auto-flagged my PSU wattage gap before I ordered. Incredible attention to detail." },
  { name: "TESSERA_LAB",   tier: "Gold",    rating: 5, text: "We equip our entire studio through AxiomCraft. Bulk pricing, priority support, and every shipment arrives perfectly packaged. Non-negotiable vendor." },
  { name: "CIPHER_X9",    tier: "Bronze",   rating: 4, text: "First build with these guys. Walked me through the entire AM5 selection via live chat. Ended up with a sub-$800 rig that punches well above weight." },
  { name: "GHOST_RENDER",  tier: "Platinum", rating: 5, text: "Three machines, all running flawlessly 18 months in. The DDR5 kits they recommended hit 7200MHz stable out of the box. Respect the expertise." },
  { name: "NEON_LATTICE",  tier: "Silver",   rating: 5, text: "Their PSU selector flagged that my 4090 Ti OC would brown out at load peaks. Saved me a catastrophic failure. Can't put a price on that." },
  { name: "QUARTZ_SIGMA",  tier: "Gold",    rating: 4, text: "Ordered Thursday, delivered Friday, built Saturday. Fastest procurement-to-render pipeline I've experienced in 12 years of workstation builds." },
  { name: "FLUX_OPERATOR", tier: "Platinum", rating: 5, text: "The Platinum tier perks alone are worth the spend. Private concierge for bulk orders and priority stock allocation. Absolutely elite service." },
  { name: "BYTE_WARDEN",  tier: "Bronze",   rating: 5, text: "As a newcomer to custom builds, the staff walked me through everything. Never felt rushed or upsold. Genuinely rare in this space." },
  { name: "MATRIX_CORP",  tier: "Gold",    rating: 5, text: "Equipped 40 workstations in a month with zero defects. Account manager tracked every order personally. AxiomCraft is our permanent vendor." },
];

const UPGRADE_FEATURES = [
  { tag: "Global Commerce",       title: "Dynamic Localization Engine",  text: "Smart IP detection auto-adjusts currency, language, and local VAT on arrival. Localized catalogs hide unshippable items and surface region-specific bestsellers — frictionlessly." },
  { tag: "Omnichannel Inventory", title: "Predictive Reserve & Hold",    text: '"Hold for Me" secures any item at your nearest branch for up to 4 hours — no payment upfront. Traffic-light stock indicators drive urgency without exposing exact counts.' },
  { tag: "Community Intelligence",title: "AI-Summarized Reviews",        text: "AI reads every review and surfaces what actually matters in seconds. Filter by build type, vote on helpfulness, and upload photos or clips of your rig in action." },
  { tag: "Post-Purchase",         title: "Instant Resolution Center",    text: "Select your issue — damaged, wrong part, late delivery — and receive an instant resolution: partial refund, store credit, or auto-generated return label. No queue, no wait." },
  { tag: "Order Tracking",        title: "Micro-Status Timelines",       text: "Six granular stages from Order Confirmed to Delivered, with predictive ETAs and live progress animations. Eliminates 'Where is my order?' support tickets entirely." },
  { tag: "Last-Mile Security",    title: "Uber-Style Live Dispatch",     text: "Live GPS rider map, masked two-way comms, and OTP Proof of Delivery. Your package reaches you and only you — every time, with photographic confirmation." },
];

/* ─── UTILITIES ─────────────────────────────────────────────────────────── */

/** Returns the Tailwind class set for a given operator tier badge */
function tierBadgeClasses(tier: string): string {
  const map: Record<string, string> = {
    Platinum: "border-primary/40 bg-primary/10 text-primary",
    Gold:     "border-yellow-400/40 bg-yellow-400/10 text-yellow-400",
    Silver:   "border-slate-400/40 bg-slate-400/10 text-slate-400",
  };
  return map[tier] ?? "border-amber-600/40 bg-amber-600/10 text-amber-600";
}

/* ─── CARD COMPONENTS ────────────────────────────────────────────────────── */

/** Customer quote card rendered inside the testimonials marquee row */
function TestimonialCard({
  testimonial,
}: {
  testimonial: (typeof TESTIMONIALS)[0];
}) {
  return (
    /* ===== Testimonial Card Start ===== */
    <article className="testimonial-card">
      {/* Hover glow overlay — purely decorative */}
      <div className="testimonial-card-hover-glow" aria-hidden="true" />

      {/* Star rating using Zap icons */}
      <div className="testimonial-card-rating">
        {Array(testimonial.rating)
          .fill(0)
          .map((_, i) => (
            <Zap key={i} className="w-3 h-3 text-primary fill-primary" />
          ))}
      </div>

      {/* Quote body */}
      <blockquote className="testimonial-card-quote">
        "{testimonial.text}"
      </blockquote>

      {/* Author row */}
      <footer className="testimonial-card-author-row">
        <div>
          <p className="testimonial-card-author-name">{testimonial.name}</p>
          <p className="testimonial-card-author-tier">
            {testimonial.tier} Operator
          </p>
        </div>
        {/* Tier badge icon */}
        <div
          className={`testimonial-card-tier-badge ${tierBadgeClasses(testimonial.tier)}`}
        >
          <Shield className="w-3.5 h-3.5" />
        </div>
      </footer>
    </article>
    /* ===== Testimonial Card End ===== */
  );
}

/** Platform feature highlight card rendered inside the upgrade marquee row */
function UpgradeCard({
  feature,
}: {
  feature: (typeof UPGRADE_FEATURES)[0];
}) {
  return (
    /* ===== Upgrade Card Start ===== */
    <article className="upgrade-card">
      {/* Hover glow overlay — purely decorative */}
      <div className="upgrade-card-hover-glow" aria-hidden="true" />

      {/* Category tag */}
      <div className="upgrade-card-tag-row">
        <span className="upgrade-card-tag">{feature.tag}</span>
      </div>

      {/* Feature name */}
      <h4 className="upgrade-card-title">{feature.title}</h4>

      {/* Feature description */}
      <p className="upgrade-card-description">{feature.text}</p>

      {/* Bottom accent line */}
      <div className="upgrade-card-divider" aria-hidden="true" />
    </article>
    /* ===== Upgrade Card End ===== */
  );
}

/* ─── MARQUEE ROW ────────────────────────────────────────────────────────── */

/**
 * MarqueeRow — wraps any list of items in an infinite-scrolling row.
 *
 * - Renders `items` twice (a- and b-prefixed keys) so the CSS `-50%`
 *   translate lands exactly on the copy boundary — no visible seam.
 * - Direction is controlled by the `.marquee-ltr` / `.marquee-rtl` class.
 * - Speed is driven by `--marquee-speed` on the parent `.marquee-track`.
 * - Hover pause is handled globally in CSS: `.marquee-track:hover .marquee-ltr`
 */
function MarqueeRow({
  items,
  renderItem,
  direction = 1,
  speedSeconds = 40,
}: {
  items: unknown[];
  renderItem: (item: unknown, key: string) => ReactNode;
  direction?: 1 | -1;
  speedSeconds?: number;
}) {
  const trackClass = direction === 1 ? "marquee-ltr" : "marquee-rtl";

  return (
    /* ===== Marquee Row Start ===== */
    <div className="marquee-row-wrapper marquee-track">
      <div
        className={`flex ${trackClass}`}
        style={{ "--marquee-speed": `${speedSeconds}s` } as React.CSSProperties}
      >
        {items.map((item, i) => renderItem(item, `a-${i}`))}
        {items.map((item, i) => renderItem(item, `b-${i}`))}
      </div>

      {/* Fade edges — mask the left and right scroll boundaries */}
      <div className="marquee-row-fade-left"  aria-hidden="true" />
      <div className="marquee-row-fade-right" aria-hidden="true" />
    </div>
    /* ===== Marquee Row End ===== */
  );
}

/* ─── MAIN EXPORT ────────────────────────────────────────────────────────── */

export function TestimonialsSection() {
  return (
    /* ===== Testimonials Section Start ===== */
    <section className="testimonials-section">
      <div className="page-container">

        {/* ── Section Header ── */}
        <div className="section-header-centered">
          <p className="section-overline">Field Reports</p>
          <h2 className="section-heading">Operator Verified</h2>
          <p className="section-description">
            Real builds. Real results. Unfiltered operator feedback from the field.
          </p>
        </div>

      </div>

      {/* ── Row 1: Customer Testimonials (left → right) ── */}
      <MarqueeRow
        items={TESTIMONIALS}
        direction={1}
        speedSeconds={90}
        renderItem={(item, key) => (
          <TestimonialCard
            key={key}
            testimonial={item as (typeof TESTIMONIALS)[0]}
          />
        )}
      />

      {/* ── Row 2: Platform Feature Highlights (right → left) ── */}
      <MarqueeRow
        items={UPGRADE_FEATURES}
        direction={-1}
        speedSeconds={75}
        renderItem={(item, key) => (
          <UpgradeCard
            key={key}
            feature={item as (typeof UPGRADE_FEATURES)[0]}
          />
        )}
      />
    </section>
    /* ===== Testimonials Section End ===== */
  );
}
