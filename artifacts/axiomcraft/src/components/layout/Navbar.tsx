/**
 * Navbar — fixed top navigation bar for AxiomCraft.
 *
 * Responsibilities:
 *  - Logo wordmark + icon
 *  - Desktop navigation: Home, Hardware dropdown, Tools dropdown, Contact,
 *    role-gated Dashboard / My Branch links
 *  - Right-side actions: search button, Deals badge, UserMenu, cart icon,
 *    mobile hamburger toggle
 *  - Keyboard shortcut: ⌘K / Ctrl+K opens the search modal
 *  - Frosted-glass backdrop when scrolled past 20 px
 *
 * Sub-components (same file — small enough to stay co-located):
 *   DropdownMenu   — hover/click dropdown with animated panel
 *   UserMenu       — authenticated user avatar + popup profile menu
 *
 * Extracted to separate files:
 *   SearchModal    — full-screen command palette overlay
 *   MobileMenu     — full-screen slide-in mobile navigation
 */

import { Link, useLocation } from "react-router-dom";
import {
  ShoppingCart, Menu, X, Cpu, ChevronDown, User, Search,
  Crown, Tag, Wrench, ArrowRight, Star, LogOut, Heart,
  Layers, Building2, SlidersHorizontal, Terminal,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCartManager } from "@/hooks/use-cart-manager";
import { useUserStore, TIER_CONFIG, isOwner, isManager, type Tier } from "@/store/user-store";
import { SearchModal } from "@/components/nav/SearchModal";
import { MobileMenu  } from "@/components/nav/MobileMenu";
import { CurrencySelector } from "@/components/CurrencySelector";

/* ─── NAVIGATION DATA ────────────────────────────────────────────────────── */

const HARDWARE_LINKS = [
  { label: "GPUs",         href: "/products?category=gpus",         desc: "Graphics processing units"   },
  { label: "CPUs",         href: "/products?category=cpus",         desc: "Processors & cores"          },
  { label: "Motherboards", href: "/products?category=motherboards",  desc: "System foundations"          },
  { label: "Memory",       href: "/products?category=memory",        desc: "DDR5 & high-speed RAM"       },
  { label: "Storage",      href: "/products?category=storage",       desc: "NVMe & SSDs"                 },
  { label: "PSUs",         href: "/products?category=psus",          desc: "Power supplies"              },
  { label: "All Hardware", href: "/products",                        desc: "Browse full catalog"         },
];

/* ─── SUB-COMPONENTS ────────────────────────────────────────────────────── */

/**
 * DropdownMenu — generic hover + click dropdown wrapper.
 *
 * Opens on mouseenter, closes on mouseleave or external click.
 * Renders an animated panel below the trigger button.
 */
function DropdownMenu({
  children,
  label,
  icon: Icon,
}: {
  children: React.ReactNode;
  label: string;
  icon?: React.ElementType;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMenu = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setIsOpen(true);
  };

  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setIsOpen(false), 180);
  };

  /* Close when clicking outside this component */
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  /* Cleanup timer on unmount */
  useEffect(() => {
    return () => { if (closeTimer.current) clearTimeout(closeTimer.current); };
  }, []);

  return (
    /* ===== Dropdown Menu Start ===== */
    <div ref={containerRef} className="relative">
      {/* ── Dropdown Trigger Button ── */}
      <button
        onMouseEnter={openMenu}
        onMouseLeave={scheduleClose}
        onClick={() => setIsOpen((prev) => !prev)}
        className="navbar-dropdown-trigger"
      >
        {Icon && <Icon className="w-4 h-4" />}
        {label}
        <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-3.5 h-3.5" />
        </motion.span>
      </button>

      {/* ── Animated Dropdown Panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={  { opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            onMouseEnter={openMenu}
            onMouseLeave={scheduleClose}
            className="navbar-dropdown-panel"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    /* ===== Dropdown Menu End ===== */
  );
}

/**
 * UserMenu — authenticated user avatar + popup profile/links menu.
 *
 * Shows a plain User icon link to /account when logged out.
 * Shows username + popup when logged in, with role-gated links.
 */
function UserMenu() {
  const { user, logout } = useUserStore();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  /* Close on route change */
  useEffect(() => { setIsOpen(false); }, [location.pathname]);

  /* Close on outside click */
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  /* ── Logged-out state: plain icon link ── */
  if (!user) {
    return (
      <Link to="/account" className="navbar-icon-button" aria-label="Sign in">
        <User className="w-5 h-5" />
      </Link>
    );
  }

  const tierConfig = TIER_CONFIG[user.tier as Tier];

  return (
    /* ===== User Menu Start ===== */
    <div ref={containerRef} className="relative">
      {/* ── Avatar / Username Trigger ── */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`navbar-user-trigger ${tierConfig.color}`}
      >
        <User className="w-5 h-5" />
        <span className="hidden md:block">{user.username}</span>
      </button>

      {/* ── Profile Popup ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={  { opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="navbar-user-popup"
          >
            {/* User summary header */}
            <div className="navbar-user-popup-header">
              <p className="navbar-user-popup-name">{user.username}</p>
              <p className="navbar-user-popup-email">{user.email}</p>
              <span className={`navbar-user-popup-tier ${tierConfig.color}`}>
                {tierConfig.label} Operator
              </span>
            </div>

            {/* Standard account links */}
            <Link to="/account"  onClick={() => setIsOpen(false)} className="navbar-popup-link">
              <User  className="w-4 h-4 text-muted-foreground" /> My Profile
            </Link>
            <Link to="/wishlist" onClick={() => setIsOpen(false)} className="navbar-popup-link">
              <Heart className="w-4 h-4 text-muted-foreground" /> Wishlist
            </Link>

            {/* Role-gated links */}
            {isOwner(user) && (
              <>
                <Link to="/dashboard" onClick={() => setIsOpen(false)} className="navbar-popup-link navbar-popup-link--role">
                  <Layers className="w-4 h-4" /> Owner Dashboard
                </Link>
                <Link to="/admin/gateways" onClick={() => setIsOpen(false)} className="navbar-popup-link navbar-popup-link--role">
                  <SlidersHorizontal className="w-4 h-4" /> Gateway Settings
                </Link>
              </>
            )}
            {isManager(user) && (
              <Link to="/manager"   onClick={() => setIsOpen(false)} className="navbar-popup-link navbar-popup-link--role">
                <Building2 className="w-4 h-4" /> Manager Panel
              </Link>
            )}
            {user.tier === "platinum" && (
              <Link to="/platinum"  onClick={() => setIsOpen(false)} className="navbar-popup-link navbar-popup-link--role">
                <Crown     className="w-4 h-4" /> Platinum Vault
              </Link>
            )}

            {/* Sign out */}
            <button
              onClick={() => { logout(); setIsOpen(false); }}
              className="navbar-popup-sign-out"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    /* ===== User Menu End ===== */
  );
}

/* ─── MAIN EXPORT ────────────────────────────────────────────────────────── */

export function Navbar() {
  const location     = useLocation();
  const { itemCount } = useCartManager();
  const { user }     = useUserStore();

  const [isScrolled,      setIsScrolled]      = useState(false);
  const [mobileMenuOpen,  setMobileMenuOpen]  = useState(false);
  const [searchOpen,      setSearchOpen]      = useState(false);

  /* Frosted-glass effect when the page is scrolled */
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ⌘K / Ctrl+K keyboard shortcut to open search */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  /* Close mobile menu on route change */
  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  const isActivePath = (path: string) => location.pathname === path;

  return (
    /* ===== Navbar Start ===== */
    <>
      {/* ── Search Command Palette ── */}
      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />

      {/* ── Main Header Bar ── */}
      <header
        className={`navbar-header ${
          isScrolled
            ? "navbar-header--scrolled"
            : "navbar-header--transparent"
        }`}
      >
        <div className="page-container">
          <div className="navbar-inner">

            {/* ── Logo ── */}
            <Link to="/" className="navbar-logo" data-testid="link-home">
              <div className="navbar-logo-icon-wrapper">
                <Cpu className="w-6 h-6 text-primary" />
              </div>
              <span className="navbar-logo-wordmark">
                AXIOM<span className="text-primary">CRAFT</span>
              </span>
            </Link>

            {/* ── Desktop Navigation ── */}
            <nav className="navbar-desktop-nav" aria-label="Main navigation">
              <Link
                to="/"
                className={`navbar-nav-link ${isActivePath("/") ? "navbar-nav-link--active" : ""}`}
              >
                Home
              </Link>

              {/* Hardware dropdown */}
              <DropdownMenu label="Hardware">
                <div className="navbar-dropdown-grid">
                  {HARDWARE_LINKS.map((link) => (
                    <Link key={link.href} to={link.href} className="navbar-dropdown-item">
                      <span className="navbar-dropdown-item-label">{link.label}</span>
                      <span className="navbar-dropdown-item-desc">{link.desc}</span>
                    </Link>
                  ))}
                </div>
              </DropdownMenu>

              {/* Tools dropdown */}
              <DropdownMenu label="Tools">
                <Link to="/build"   className="navbar-dropdown-item-icon">
                  <Wrench    className="w-4 h-4 text-primary shrink-0" />
                  <div><p className="navbar-dropdown-item-label">PC Builder</p><p className="navbar-dropdown-item-desc">Configure your rig</p></div>
                </Link>
                <Link to="/compare" className="navbar-dropdown-item-icon">
                  <ArrowRight className="w-4 h-4 text-primary shrink-0" />
                  <div><p className="navbar-dropdown-item-label">Compare</p><p className="navbar-dropdown-item-desc">Side-by-side specs</p></div>
                </Link>
                <Link to="/deals"   className="navbar-dropdown-item-icon">
                  <Tag        className="w-4 h-4 text-destructive shrink-0" />
                  <div><p className="navbar-dropdown-item-label">Deals</p><p className="navbar-dropdown-item-desc">Discounted hardware</p></div>
                </Link>
              </DropdownMenu>

              <Link
                to="/contact"
                className={`navbar-nav-link ${isActivePath("/contact") ? "navbar-nav-link--active" : ""}`}
              >
                Contact
              </Link>

              {/* Dev Mode dropdown — owner only */}
              {isOwner(user) && (
                <>
                  <span className="w-px h-4 bg-border/60 mx-1 shrink-0" aria-hidden />
                  <DropdownMenu label="Dev Mode">
                    <Link to="/dashboard" className="navbar-dropdown-item-icon">
                      <Layers className="w-4 h-4 text-primary shrink-0" />
                      <div>
                        <p className="navbar-dropdown-item-label">Dashboard</p>
                        <p className="navbar-dropdown-item-desc">Owner control panel</p>
                      </div>
                    </Link>
                    <Link to="/admin/gateways" className="navbar-dropdown-item-icon">
                      <SlidersHorizontal className="w-4 h-4 text-primary shrink-0" />
                      <div>
                        <p className="navbar-dropdown-item-label">Gateways</p>
                        <p className="navbar-dropdown-item-desc">Provider switchboard</p>
                      </div>
                    </Link>
                  </DropdownMenu>
                </>
              )}
              {isManager(user) && (
                <>
                  <span className="w-px h-4 bg-border/60 mx-1 shrink-0" aria-hidden />
                  <Link
                    to="/manager"
                    className={`navbar-role-link ${isActivePath("/manager") ? "navbar-role-link--active" : ""}`}
                  >
                    <Building2 className="w-3.5 h-3.5" /> My Branch
                  </Link>
                </>
              )}
            </nav>

            {/* ── Right-Side Action Cluster ── */}
            <div className="navbar-actions">

              {/* Desktop search button */}
              <button
                onClick={() => setSearchOpen(true)}
                className="navbar-search-button"
                aria-label="Search"
              >
                <Search className="w-3.5 h-3.5 group-hover:text-primary transition-colors" />
                <span className="navbar-search-placeholder">Search...</span>
                <kbd className="navbar-search-kbd">⌘K</kbd>
              </button>

              {/* Mobile search icon */}
              <button
                onClick={() => setSearchOpen(true)}
                className="md:hidden navbar-icon-button"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Currency selector */}
              <div className="hidden md:block">
                <CurrencySelector />
              </div>

              {/* Authenticated user menu */}
              <UserMenu />

              {/* Cart with animated item count badge */}
              <Link to="/cart" className="navbar-icon-button relative" data-testid="link-cart">
                <ShoppingCart className="w-5 h-5" />
                <AnimatePresence>
                  {itemCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={  { scale: 0 }}
                      className="navbar-cart-badge"
                    >
                      {itemCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>

              {/* Mobile hamburger toggle */}
              <button
                className="lg:hidden navbar-icon-button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                data-testid="button-mobile-menu"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* ── Mobile Slide-In Navigation ── */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        user={user}
        onOpenSearch={() => { setMobileMenuOpen(false); setSearchOpen(true); }}
      />
    </>
    /* ===== Navbar End ===== */
  );
}
