/**
 * MobileMenu — full-screen slide-in navigation panel for mobile viewports.
 *
 * Slides in from the right edge on open, slides out on close.
 * Automatically closes when the route changes (handled by Navbar via
 * a `useEffect` on `location.pathname`).
 *
 * Contents:
 *  - Search shortcut button
 *  - Home link
 *  - Hardware submenu (2-column grid)
 *  - PC Builder / Compare / Deals links
 *  - Contact / Account / Wishlist links
 *  - Role-gated Dashboard / Branch / Platinum links
 *
 * Self-contained: copy this file + the nav data arrays and it works in
 * any React Router + Framer Motion project.
 */

import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search, Wrench, ArrowRight, Tag, User, Heart, Layers, Building2, Crown, SlidersHorizontal, Terminal,
} from "lucide-react";
import { isOwner, isManager, type UserProfile } from "@/store/user-store";

/* ─── HARDWARE LINKS (mirrored from Navbar for self-containment) ─────────── */
const HARDWARE_LINKS = [
  { label: "GPUs",          href: "/products?category=gpus" },
  { label: "CPUs",          href: "/products?category=cpus" },
  { label: "Motherboards",  href: "/products?category=motherboards" },
  { label: "Memory",        href: "/products?category=memory" },
  { label: "Storage",       href: "/products?category=storage" },
  { label: "PSUs",          href: "/products?category=psus" },
  { label: "All Hardware",  href: "/products" },
];

/* ─── ANIMATION VARIANTS ────────────────────────────────────────────────── */
const menuVariants = {
  hidden:  { opacity: 0, x: "100%" },
  visible: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: "100%" },
};

/* ─── PROPS ─────────────────────────────────────────────────────────────── */
interface MobileMenuProps {
  /** Whether the menu is currently open */
  isOpen: boolean;
  /** Currently authenticated user — null when logged out */
  user: UserProfile | null;
  /** Opens the global search modal */
  onOpenSearch: () => void;
}

/* ─── MAIN EXPORT ────────────────────────────────────────────────────────── */

export function MobileMenu({ isOpen, user, onOpenSearch }: MobileMenuProps) {
  return (
    /* ===== Mobile Menu Start ===== */
    <AnimatePresence>
      {isOpen && (
        <motion.nav
          className="mobile-menu"
          variants={menuVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          aria-label="Mobile navigation"
        >
          <div className="mobile-menu-inner">

            {/* ── Search Shortcut ── */}
            <button
              onClick={onOpenSearch}
              className="mobile-menu-search-btn"
            >
              <Search className="w-5 h-5" />
              <span>Search Hardware</span>
            </button>

            {/* ── Primary Navigation Links ── */}
            <Link to="/"       className="mobile-menu-primary-link">Home</Link>

            {/* Hardware sub-section */}
            <div className="mobile-menu-submenu">
              <p className="mobile-menu-submenu-title">Hardware</p>
              <div className="mobile-menu-submenu-grid">
                {HARDWARE_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="mobile-menu-submenu-link"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <Link to="/build"   className="mobile-menu-icon-link">
              <Wrench    className="w-6 h-6" /> PC Builder
            </Link>
            <Link to="/compare" className="mobile-menu-icon-link">
              <ArrowRight className="w-6 h-6" /> Compare
            </Link>
            <Link to="/deals"   className="mobile-menu-icon-link mobile-menu-icon-link--destructive">
              <Tag        className="w-6 h-6" /> Deals
            </Link>
            <Link to="/contact" className="mobile-menu-primary-link">Contact</Link>
            <Link to="/account" className="mobile-menu-icon-link">
              <User       className="w-6 h-6" /> Account
            </Link>
            <Link to="/wishlist" className="mobile-menu-icon-link">
              <Heart      className="w-6 h-6" /> Wishlist
            </Link>

            {/* ── Dev Mode (Owner) ── */}
            {isOwner(user) && (
              <>
                <div className="flex items-center gap-2 pt-2 pb-1">
                  <Terminal className="w-3.5 h-3.5 text-primary" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Dev Mode</span>
                </div>
                <Link to="/dashboard" className="mobile-menu-icon-link mobile-menu-icon-link--primary">
                  <Layers className="w-6 h-6" /> Dashboard
                </Link>
                <Link to="/admin/gateways" className="mobile-menu-icon-link mobile-menu-icon-link--primary">
                  <SlidersHorizontal className="w-6 h-6" /> Gateways
                </Link>
              </>
            )}
            {isManager(user) && (
              <Link to="/manager"   className="mobile-menu-icon-link mobile-menu-icon-link--primary">
                <Building2 className="w-6 h-6" /> My Branch
              </Link>
            )}
            {user?.tier === "platinum" && (
              <Link to="/platinum" className="mobile-menu-icon-link mobile-menu-icon-link--primary">
                <Crown    className="w-6 h-6" /> Platinum Vault
              </Link>
            )}

          </div>
        </motion.nav>
      )}
    </AnimatePresence>
    /* ===== Mobile Menu End ===== */
  );
}
