import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, X, Cpu, HardDrive, MemoryStick, Zap, CircuitBoard, MonitorSpeaker, ArrowRight, TrendingUp, Command } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDebounce } from "@/hooks/use-debounce";

const API = import.meta.env.VITE_API_URL || `${import.meta.env.BASE_URL}api`;

interface Suggestion {
  id: number;
  name: string;
  category: string;
  basePrice: number;
  salePrice: number | null;
  imageUrl: string;
  slug: string;
}

const CATEGORIES = [
  { label: "GPUs", icon: MonitorSpeaker, href: "/products?category=gpus", color: "text-violet-400" },
  { label: "CPUs", icon: Cpu, href: "/products?category=cpus", color: "text-primary" },
  { label: "Motherboards", icon: CircuitBoard, href: "/products?category=motherboards", color: "text-yellow-400" },
  { label: "Memory", icon: MemoryStick, href: "/products?category=memory", color: "text-green-400" },
  { label: "Storage", icon: HardDrive, href: "/products?category=storage", color: "text-orange-400" },
  { label: "PSUs", icon: Zap, href: "/products?category=psus", color: "text-red-400" },
];

const TRENDING = [
  "RTX 5090", "Ryzen 9 9950X", "DDR5 32GB", "X870E", "PCIe 5.0 SSD", "1000W PSU"
];

function ProductResultCard({
  product,
  isActive,
  onClick,
  idx,
}: {
  product: Suggestion;
  isActive: boolean;
  onClick: () => void;
  idx: number;
}) {
  const price = product.salePrice ?? product.basePrice;
  const hasDiscount = product.salePrice !== null && product.salePrice < product.basePrice;
  const discountPct = hasDiscount
    ? Math.round((1 - product.salePrice! / product.basePrice) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.04, duration: 0.2 }}
    >
      <Link
        to={`/products/${product.id}`}
        onClick={onClick}
        className={`flex items-center gap-4 px-5 py-3.5 transition-all group relative ${
          isActive ? "bg-primary/10 border-l-2 border-primary" : "border-l-2 border-transparent hover:bg-white/[0.03] hover:border-l-primary/40"
        }`}
      >
        {/* Image */}
        <div className="relative shrink-0">
          <img
            src={product.imageUrl || `https://picsum.photos/seed/${product.slug}/80/80`}
            alt={product.name}
            className="w-14 h-14 object-cover rounded-sm bg-muted"
          />
          {hasDiscount && (
            <div className="absolute -top-1.5 -right-1.5 bg-destructive text-white font-mono text-[9px] font-bold px-1 py-0.5 rounded-sm">
              -{discountPct}%
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className={`font-heading font-bold text-sm truncate transition-colors ${isActive ? "text-primary" : "group-hover:text-primary"}`}>
            {product.name}
          </p>
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-wide mt-0.5">
            {product.category}
          </p>
        </div>

        {/* Price */}
        <div className="text-right shrink-0 ml-2">
          <p className={`font-mono text-sm font-bold ${hasDiscount ? "text-primary" : "text-foreground"}`}>
            ${price.toLocaleString()}
          </p>
          {hasDiscount && (
            <p className="font-mono text-xs text-muted-foreground line-through">
              ${product.basePrice.toLocaleString()}
            </p>
          )}
        </div>

        {/* Arrow indicator */}
        <ArrowRight className={`w-4 h-4 shrink-0 transition-all ${isActive ? "text-primary translate-x-0 opacity-100" : "text-transparent -translate-x-2 opacity-0 group-hover:text-muted-foreground group-hover:translate-x-0 group-hover:opacity-100"}`} />
      </Link>
    </motion.div>
  );
}

export function SearchBar({ onClose }: { onClose?: () => void }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [similar, setSimilar] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const debouncedQuery = useDebounce(query, 250);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  useEffect(() => {
    setActiveIdx(-1);
    if (debouncedQuery.length < 2) {
      setSuggestions([]);
      setSimilar([]);
      return;
    }
    setLoading(true);
    fetch(`${API}/search/suggest?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((data) => {
        setSuggestions(data.suggestions || []);
        setSimilar(data.similar || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  const allResults = suggestions.length > 0 ? suggestions : (debouncedQuery.length >= 2 && !loading ? similar : []);
  const noResults = debouncedQuery.length >= 2 && !loading && suggestions.length === 0;

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (query.trim()) {
      if (activeIdx >= 0 && allResults[activeIdx]) {
        navigate(`/products/${allResults[activeIdx].id}`);
      } else {
        navigate(`/products?search=${encodeURIComponent(query.trim())}`);
      }
      onClose?.();
    }
  }, [query, activeIdx, allResults, navigate, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, allResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      onClose?.();
    }
  }, [allResults.length, onClose]);

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col">
      {/* Search input */}
      <form onSubmit={handleSubmit} className="relative">
        <div className={`flex items-center gap-3 border-b-2 px-2 py-3 transition-colors ${query ? "border-primary" : "border-border"}`}>
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="spinner"
                initial={{ opacity: 0, rotate: 0 }}
                animate={{ opacity: 1, rotate: 360 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full shrink-0"
              />
            ) : (
              <motion.div key="icon" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Search className="w-5 h-5 text-primary shrink-0" />
              </motion.div>
            )}
          </AnimatePresence>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search hardware, specs, models..."
            className="flex-1 bg-transparent font-mono text-base text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />

          <div className="flex items-center gap-2 shrink-0">
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(""); setSuggestions([]); setSimilar([]); inputRef.current?.focus(); }}
                className="w-6 h-6 rounded-sm border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <kbd className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 bg-muted/40 border border-border rounded-sm font-mono text-[10px] text-muted-foreground">
              ESC
            </kbd>
          </div>
        </div>

        {/* Animated scan line */}
        <motion.div
          className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent origin-left"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: query ? 1 : 0, opacity: query ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />
      </form>

      {/* Results / Default state */}
      <div ref={resultsRef} className="flex-1 overflow-y-auto max-h-[460px] overscroll-contain">
        <AnimatePresence mode="wait">

          {/* Default state — categories + trending */}
          {!query && (
            <motion.div
              key="default"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="p-5 space-y-6"
            >
              {/* Category quick links */}
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Browse by category</p>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <Link
                        key={cat.label}
                        to={cat.href}
                        onClick={onClose}
                        className="flex items-center gap-2.5 px-3 py-2.5 border border-border rounded-sm hover:border-primary/40 hover:bg-white/[0.03] transition-all group"
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${cat.color} group-hover:scale-110 transition-transform`} />
                        <span className="font-heading font-bold text-xs">{cat.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Trending searches */}
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3" /> Trending searches
                </p>
                <div className="flex flex-wrap gap-2">
                  {TRENDING.map((term) => (
                    <button
                      key={term}
                      onClick={() => setQuery(term)}
                      className="px-3 py-1.5 border border-border rounded-sm font-mono text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-white/[0.03] transition-all"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Loading state */}
          {query && loading && debouncedQuery.length >= 2 && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 flex flex-col items-center gap-3"
            >
              <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="font-mono text-xs text-muted-foreground">Scanning catalog...</p>
            </motion.div>
          )}

          {/* Results */}
          {!loading && suggestions.length > 0 && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="px-5 py-2.5 border-b border-border/50 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {suggestions.length} result{suggestions.length !== 1 ? "s" : ""} found
                </span>
                <span className="font-mono text-[10px] text-muted-foreground/60">↑↓ navigate · ↵ select</span>
              </div>
              {suggestions.map((s, i) => (
                <ProductResultCard
                  key={s.id}
                  product={s}
                  isActive={i === activeIdx}
                  onClick={() => onClose?.()}
                  idx={i}
                />
              ))}
              <Link
                to={`/products?search=${encodeURIComponent(query)}`}
                onClick={onClose}
                className="flex items-center justify-center gap-2 px-5 py-3.5 border-t border-border font-mono text-xs text-primary hover:bg-primary/5 transition-colors group"
              >
                View all results for <span className="font-bold">"{query}"</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          )}

          {/* No results + similar */}
          {!loading && noResults && (
            <motion.div
              key="noresults"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="px-5 py-6 text-center border-b border-border/50">
                <p className="font-mono text-sm text-muted-foreground">
                  No results for <span className="text-foreground font-bold">"{query}"</span>
                </p>
                <p className="font-mono text-xs text-muted-foreground/60 mt-1">Try a different term, or browse categories above</p>
              </div>
              {similar.length > 0 && (
                <>
                  <div className="px-5 py-2.5 border-b border-border/50">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">You might like</span>
                  </div>
                  {similar.map((s, i) => (
                    <ProductResultCard
                      key={s.id}
                      product={s}
                      isActive={i === activeIdx}
                      onClick={() => onClose?.()}
                      idx={i}
                    />
                  ))}
                </>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="border-t border-border/50 px-5 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground/50">
          <span className="flex items-center gap-1"><kbd className="border border-border/60 rounded px-1">↵</kbd> open</span>
          <span className="flex items-center gap-1"><kbd className="border border-border/60 rounded px-1">↑↓</kbd> navigate</span>
          <span className="hidden sm:flex items-center gap-1"><kbd className="border border-border/60 rounded px-1">esc</kbd> close</span>
        </div>
        <div className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground/40">
          <Command className="w-3 h-3" /> AXIOMCRAFT SEARCH
        </div>
      </div>
    </div>
  );
}
