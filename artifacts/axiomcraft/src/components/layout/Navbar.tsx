import { Link, useLocation } from "react-router-dom";
import { ShoppingCart, Menu, X, Cpu, ChevronDown, User, Search, Crown, Tag, Wrench, ArrowRight, Star, Zap, LogOut } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useCartManager } from "@/hooks/use-cart-manager";
import { motion, AnimatePresence } from "framer-motion";
import { useUserStore, TIER_CONFIG, type Tier } from "@/store/user-store";
import { SearchBar } from "@/components/SearchBar";

const HARDWARE_LINKS = [
  { label: "GPUs", href: "/products?category=gpus", desc: "Graphics processing units" },
  { label: "CPUs", href: "/products?category=cpus", desc: "Processors & cores" },
  { label: "Motherboards", href: "/products?category=motherboards", desc: "System foundations" },
  { label: "Memory", href: "/products?category=memory", desc: "DDR5 & high-speed RAM" },
  { label: "Storage", href: "/products?category=storage", desc: "NVMe & SSDs" },
  { label: "PSUs", href: "/products?category=psus", desc: "Power supplies" },
  { label: "All Hardware", href: "/products", desc: "Browse full catalog" },
];

function DropdownMenu({ children, label, icon: Icon }: { children: React.ReactNode; label: string; icon?: React.ElementType }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-sm font-medium tracking-wide uppercase transition-colors hover:text-primary text-muted-foreground py-1"
      >
        {Icon && <Icon className="w-4 h-4" />}
        {label}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-3.5 h-3.5" />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            className="absolute left-0 top-full mt-2 z-50 min-w-[280px] bg-card border border-border rounded-sm shadow-2xl overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useUserStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (!user) {
    return (
      <Link to="/account" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
        <User className="w-5 h-5" />
      </Link>
    );
  }

  const cfg = TIER_CONFIG[user.tier as Tier];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 text-sm font-mono transition-colors ${cfg.color} hover:opacity-80`}
      >
        <User className="w-5 h-5" />
        <span className="hidden md:block">{user.username}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-full mt-2 z-50 w-56 bg-card border border-border rounded-sm shadow-2xl overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-border">
              <p className="font-heading font-bold text-sm">{user.username}</p>
              <p className="font-mono text-xs text-muted-foreground">{user.email}</p>
              <span className={`inline-block mt-1 text-xs font-mono font-bold uppercase ${cfg.color}`}>{cfg.label} Operator</span>
            </div>
            <Link to="/account" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2.5 font-mono text-sm hover:bg-muted/30 transition-colors">
              <User className="w-4 h-4 text-muted-foreground" /> My Profile
            </Link>
            {user.tier === "platinum" && (
              <Link to="/platinum" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2.5 font-mono text-sm text-primary hover:bg-primary/10 transition-colors border-t border-border">
                <Crown className="w-4 h-4" /> Platinum Vault
              </Link>
            )}
            <button
              onClick={() => { logout(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 font-mono text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors border-t border-border"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Navbar() {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { itemCount } = useCartManager();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* Search command palette */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
            style={{ background: "rgba(5,5,5,0.85)", backdropFilter: "blur(20px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setSearchOpen(false); }}
          >
            <motion.div
              initial={{ y: -16, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -16, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-2xl bg-[#0a0a0c] border border-border rounded-sm shadow-[0_32px_80px_rgba(0,0,0,0.8),0_0_0_1px_rgba(0,240,255,0.06)] overflow-hidden"
            >
              {/* Top accent line */}
              <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
              <SearchBar onClose={() => setSearchOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header
        className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 border-b ${
          isScrolled ? "bg-background/80 backdrop-blur-md border-border" : "bg-transparent border-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group shrink-0" data-testid="link-home">
              <div className="w-10 h-10 bg-primary/10 border border-primary/30 flex items-center justify-center rounded-sm group-hover:bg-primary/20 transition-colors">
                <Cpu className="w-6 h-6 text-primary" />
              </div>
              <span className="font-heading font-bold text-xl tracking-wider text-foreground hidden sm:block">
                AXIOM<span className="text-primary">CRAFT</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-6">
              <Link
                to="/"
                className={`text-sm font-medium tracking-wide uppercase transition-colors hover:text-primary ${location.pathname === "/" ? "text-primary" : "text-muted-foreground"}`}
              >
                Home
              </Link>

              {/* Hardware dropdown */}
              <DropdownMenu label="Hardware">
                <div className="grid grid-cols-2 gap-0">
                  {HARDWARE_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      to={link.href}
                      className="flex flex-col px-4 py-3 hover:bg-muted/30 transition-colors border-b border-border/50 last:col-span-2"
                    >
                      <span className="font-heading font-bold text-sm">{link.label}</span>
                      <span className="font-mono text-xs text-muted-foreground">{link.desc}</span>
                    </Link>
                  ))}
                </div>
              </DropdownMenu>

              {/* Tools dropdown */}
              <DropdownMenu label="Tools">
                <Link to="/build" className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors border-b border-border/50">
                  <Wrench className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <p className="font-heading font-bold text-sm">PC Builder</p>
                    <p className="font-mono text-xs text-muted-foreground">Configure your rig</p>
                  </div>
                </Link>
                <Link to="/compare" className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors border-b border-border/50">
                  <ArrowRight className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <p className="font-heading font-bold text-sm">Compare</p>
                    <p className="font-mono text-xs text-muted-foreground">Side-by-side specs</p>
                  </div>
                </Link>
                <Link to="/deals" className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                  <Tag className="w-4 h-4 text-destructive shrink-0" />
                  <div>
                    <p className="font-heading font-bold text-sm">Deals</p>
                    <p className="font-mono text-xs text-muted-foreground">Discounted hardware</p>
                  </div>
                </Link>
              </DropdownMenu>

              <Link
                to="/contact"
                className={`text-sm font-medium tracking-wide uppercase transition-colors hover:text-primary ${location.pathname === "/contact" ? "text-primary" : "text-muted-foreground"}`}
              >
                Contact
              </Link>
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-3">
              {/* Search */}
              <button
                onClick={() => setSearchOpen(true)}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 border border-border/50 rounded-sm text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-white/[0.03] transition-all group"
                aria-label="Search"
              >
                <Search className="w-3.5 h-3.5 group-hover:text-primary transition-colors" />
                <span className="font-mono text-xs text-muted-foreground/60">Search...</span>
                <kbd className="flex items-center gap-0.5 font-mono text-[10px] text-muted-foreground/40 border border-border/40 rounded px-1 py-0.5">⌘K</kbd>
              </button>
              <button
                onClick={() => setSearchOpen(true)}
                className="md:hidden p-2 text-muted-foreground hover:text-primary transition-colors"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Deals badge */}
              <Link to="/deals" className="hidden md:flex items-center gap-1.5 px-3 py-1.5 border border-destructive/40 text-destructive font-mono text-xs uppercase rounded-sm hover:bg-destructive/10 transition-colors">
                <Zap className="w-3 h-3" /> Deals
              </Link>

              {/* User */}
              <UserMenu />

              {/* Cart */}
              <Link
                to="/cart"
                className="relative p-2 text-muted-foreground hover:text-primary transition-colors"
                data-testid="link-cart"
              >
                <ShoppingCart className="w-5 h-5" />
                <AnimatePresence>
                  {itemCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center rounded-sm"
                    >
                      {itemCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>

              {/* Mobile hamburger */}
              <button
                className="lg:hidden p-2 text-foreground"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                data-testid="button-mobile-menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-40 bg-background overflow-y-auto pt-20"
          >
            <div className="px-6 py-8 space-y-1">
              {/* Search */}
              <button
                onClick={() => { setMobileMenuOpen(false); setSearchOpen(true); }}
                className="w-full flex items-center gap-3 py-4 border-b border-border text-muted-foreground hover:text-primary transition-colors"
              >
                <Search className="w-5 h-5" />
                <span className="font-mono text-sm uppercase">Search Hardware</span>
              </button>

              <Link to="/" className="block py-4 text-2xl font-heading font-bold uppercase border-b border-border hover:text-primary transition-colors">Home</Link>

              {/* Hardware submenu */}
              <div className="py-4 border-b border-border">
                <p className="font-heading font-bold text-2xl uppercase mb-4">Hardware</p>
                <div className="grid grid-cols-2 gap-2 pl-2">
                  {HARDWARE_LINKS.map((link) => (
                    <Link key={link.href} to={link.href} className="font-mono text-sm text-muted-foreground hover:text-primary transition-colors py-1">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              <Link to="/build" className="flex items-center gap-3 py-4 text-2xl font-heading font-bold uppercase border-b border-border hover:text-primary transition-colors">
                <Wrench className="w-6 h-6" /> PC Builder
              </Link>
              <Link to="/compare" className="flex items-center gap-3 py-4 text-2xl font-heading font-bold uppercase border-b border-border hover:text-primary transition-colors">
                <ArrowRight className="w-6 h-6" /> Compare
              </Link>
              <Link to="/deals" className="flex items-center gap-3 py-4 text-2xl font-heading font-bold uppercase border-b border-border text-destructive hover:opacity-80 transition-opacity">
                <Tag className="w-6 h-6" /> Deals
              </Link>
              <Link to="/contact" className="block py-4 text-2xl font-heading font-bold uppercase border-b border-border hover:text-primary transition-colors">Contact</Link>
              <Link to="/account" className="flex items-center gap-3 py-4 text-2xl font-heading font-bold uppercase border-b border-border hover:text-primary transition-colors">
                <User className="w-6 h-6" /> Account
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
