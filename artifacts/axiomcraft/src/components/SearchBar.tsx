import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search, X, Cpu, HardDrive, MemoryStick, Zap, CircuitBoard,
  MonitorSpeaker, ArrowRight, TrendingUp, Command, Camera, ImageOff,
} from "lucide-react";
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
  { label: "GPUs",         icon: MonitorSpeaker, href: "/products?category=gpus",         color: "text-violet-400" },
  { label: "CPUs",         icon: Cpu,            href: "/products?category=cpus",         color: "text-primary"    },
  { label: "Motherboards", icon: CircuitBoard,   href: "/products?category=motherboards", color: "text-yellow-400" },
  { label: "Memory",       icon: MemoryStick,    href: "/products?category=memory",       color: "text-green-400"  },
  { label: "Storage",      icon: HardDrive,      href: "/products?category=storage",      color: "text-orange-400" },
  { label: "PSUs",         icon: Zap,            href: "/products?category=psus",         color: "text-red-400"    },
];

const TRENDING = ["RTX 5090", "Ryzen 9 9950X", "DDR5 32GB", "X870E", "PCIe 5.0 SSD", "1000W PSU"];

function ProductResultCard({
  product, isActive, onClick, idx,
}: {
  product: Suggestion; isActive: boolean; onClick: () => void; idx: number;
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
          isActive
            ? "bg-primary/10 border-l-2 border-primary"
            : "border-l-2 border-transparent hover:bg-white/[0.03] hover:border-l-primary/40"
        }`}
      >
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
        <div className="flex-1 min-w-0">
          <p className={`font-heading font-bold text-sm truncate transition-colors ${isActive ? "text-primary" : "group-hover:text-primary"}`}>
            {product.name}
          </p>
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-wide mt-0.5">
            {product.category}
          </p>
        </div>
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
        <ArrowRight className={`w-4 h-4 shrink-0 transition-all ${isActive ? "text-primary translate-x-0 opacity-100" : "text-transparent -translate-x-2 opacity-0 group-hover:text-muted-foreground group-hover:translate-x-0 group-hover:opacity-100"}`} />
      </Link>
    </motion.div>
  );
}

export function SearchBar({ onClose }: { onClose?: () => void }) {
  const [query, setQuery]           = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [similar, setSimilar]       = useState<Suggestion[]>([]);
  const [loading, setLoading]       = useState(false);
  const [activeIdx, setActiveIdx]   = useState(-1);

  /* ── Image search state ── */
  const [imagePreview, setImagePreview]   = useState<string | null>(null);
  const [imageLoading, setImageLoading]   = useState(false);
  const [imageResults, setImageResults]   = useState<Suggestion[]>([]);
  const [identified, setIdentified]       = useState<{ productName: string; category: string } | null>(null);
  const [imageError, setImageError]       = useState<string | null>(null);

  const inputRef    = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef  = useRef<HTMLDivElement>(null);
  const navigate    = useNavigate();
  const debouncedQuery = useDebounce(query, 250);

  const isImageMode = imagePreview !== null;

  useEffect(() => {
    if (!isImageMode) setTimeout(() => inputRef.current?.focus(), 80);
  }, [isImageMode]);

  useEffect(() => {
    setActiveIdx(-1);
    if (isImageMode || debouncedQuery.length < 2) {
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
  }, [debouncedQuery, isImageMode]);

  const allResults = suggestions.length > 0 ? suggestions : (debouncedQuery.length >= 2 && !loading ? similar : []);
  const noResults  = debouncedQuery.length >= 2 && !loading && suggestions.length === 0;

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (isImageMode) return;
    if (query.trim()) {
      if (activeIdx >= 0 && allResults[activeIdx]) {
        navigate(`/products/${allResults[activeIdx].id}`);
      } else {
        navigate(`/products?search=${encodeURIComponent(query.trim())}`);
      }
      onClose?.();
    }
  }, [query, activeIdx, allResults, navigate, onClose, isImageMode]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, allResults.length - 1)); }
    else if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, -1)); }
    else if (e.key === "Escape")    { onClose?.(); }
  }, [allResults.length, onClose]);

  /* ── Image handling ── */
  const clearImage = useCallback(() => {
    setImagePreview(null);
    setImageResults([]);
    setIdentified(null);
    setImageError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const handleImageFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setImageError("Please upload an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setImageError("Image must be under 8 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl);
      setImageResults([]);
      setIdentified(null);
      setImageError(null);
      setQuery("");

      const base64 = dataUrl.split(",")[1];
      const mimeType = file.type;

      setImageLoading(true);
      try {
        const res = await fetch(`${API}/search/image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, mimeType }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Search failed");
        setImageResults(data.results || []);
        setIdentified(data.identified || null);
        if ((data.results || []).length === 0) {
          setImageError("No matching products found. Try a different image.");
        }
      } catch {
        setImageError("Could not analyse image. Please try again.");
      } finally {
        setImageLoading(false);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
  }, [handleImageFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageFile(file);
  }, [handleImageFile]);

  return (
    <div
      className="w-full max-w-2xl mx-auto flex flex-col"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── Search input row ── */}
      <form onSubmit={handleSubmit} className="relative">
        <div className={`flex items-center gap-3 border-b-2 px-2 py-3 transition-colors ${
          isImageMode ? "border-primary/60" : query ? "border-primary" : "border-border"
        }`}>

          {/* Left icon — spinner / search / image thumbnail */}
          <AnimatePresence mode="wait">
            {imageLoading ? (
              <motion.div key="img-spinner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0"
              />
            ) : isImageMode ? (
              <motion.div key="img-thumb" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                <img src={imagePreview!} alt="search" className="w-8 h-8 object-cover rounded-sm border border-primary/40 shrink-0" />
              </motion.div>
            ) : loading ? (
              <motion.div key="spinner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0"
              />
            ) : (
              <motion.div key="icon" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Search className="w-5 h-5 text-primary shrink-0" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input / image mode label */}
          {isImageMode ? (
            <div className="flex-1 font-mono text-sm text-muted-foreground">
              {imageLoading
                ? "Analysing image with AI…"
                : identified?.productName
                  ? <span>Identified: <span className="text-foreground font-bold">{identified.productName}</span></span>
                  : imageError
                    ? <span className="text-destructive">{imageError}</span>
                    : "Image search active"}
            </div>
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search hardware, specs, models…"
              className="flex-1 bg-transparent font-mono text-base text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
              autoComplete="off"
              spellCheck={false}
            />
          )}

          {/* Right-side controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Clear image / Clear text */}
            {(isImageMode || query) && (
              <button
                type="button"
                onClick={() => { if (isImageMode) { clearImage(); } else { setQuery(""); setSuggestions([]); setSimilar([]); inputRef.current?.focus(); } }}
                className="w-6 h-6 rounded-sm border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                title={isImageMode ? "Clear image" : "Clear search"}
              >
                <X className="w-3 h-3" />
              </button>
            )}

            {/* Camera button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Search by image"
              className={`w-7 h-7 rounded-sm border flex items-center justify-center transition-all ${
                isImageMode
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-white/[0.03]"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
            </button>

            <kbd className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 bg-muted/40 border border-border rounded-sm font-mono text-[10px] text-muted-foreground">
              ESC
            </kbd>
          </div>
        </div>

        {/* Animated scan line */}
        <motion.div
          className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent origin-left"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: (isImageMode || query) ? 1 : 0, opacity: (isImageMode || query) ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />
      </form>

      {/* ── Results / Default state ── */}
      <div ref={resultsRef} className="flex-1 overflow-y-auto max-h-[460px] overscroll-contain">
        <AnimatePresence mode="wait">

          {/* ── IMAGE SEARCH RESULTS ── */}
          {isImageMode && (
            <motion.div key="image-results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {imageLoading && (
                <div className="py-12 flex flex-col items-center gap-3">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-sm border border-border overflow-hidden">
                      <img src={imagePreview!} alt="" className="w-full h-full object-cover opacity-60" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                    </div>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">AI is identifying the component…</p>
                </div>
              )}

              {!imageLoading && imageResults.length > 0 && (
                <>
                  {/* Header with identified label + image thumb */}
                  <div className="px-5 py-3 border-b border-border/50 flex items-center gap-3">
                    <img src={imagePreview!} alt="" className="w-8 h-8 object-cover rounded-sm border border-border/60" />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Visual match</p>
                      {identified?.productName && (
                        <p className="font-heading font-bold text-xs text-primary truncate">{identified.productName}</p>
                      )}
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground/60">
                      {imageResults.length} result{imageResults.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {imageResults.map((s, i) => (
                    <ProductResultCard
                      key={s.id} product={s} isActive={i === activeIdx}
                      onClick={() => onClose?.()} idx={i}
                    />
                  ))}
                </>
              )}

              {!imageLoading && imageResults.length === 0 && !imageError && (
                <div className="py-12 flex flex-col items-center gap-3 text-center px-8">
                  <ImageOff className="w-8 h-8 text-muted-foreground/40" />
                  <p className="font-mono text-sm text-muted-foreground">No matching products found</p>
                  <p className="font-mono text-xs text-muted-foreground/50">Try a clearer photo of the component</p>
                </div>
              )}

              {!imageLoading && imageError && imageResults.length === 0 && (
                <div className="py-12 flex flex-col items-center gap-3 text-center px-8">
                  <ImageOff className="w-8 h-8 text-destructive/40" />
                  <p className="font-mono text-sm text-muted-foreground">{imageError}</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Default state — categories + trending + drag zone ── */}
          {!isImageMode && !query && (
            <motion.div key="default" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
              className="p-5 space-y-6"
            >
              {/* Image search drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-3 px-4 py-3.5 border border-dashed border-border rounded-sm cursor-pointer hover:border-primary/40 hover:bg-white/[0.02] transition-all group"
              >
                <Camera className="w-4 h-4 text-primary/60 group-hover:text-primary transition-colors shrink-0" />
                <div>
                  <p className="font-mono text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                    Search by image — drop a photo or click to upload
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground/50">AI will identify the component and find matches</p>
                </div>
              </div>

              {/* Category quick links */}
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Browse by category</p>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <Link key={cat.label} to={cat.href} onClick={onClose}
                        className="flex items-center gap-2.5 px-3 py-2.5 border border-border rounded-sm hover:border-primary/40 hover:bg-white/[0.03] transition-all group"
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${cat.color} group-hover:scale-110 transition-transform`} />
                        <span className="font-heading font-bold text-xs">{cat.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Trending */}
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3" /> Trending searches
                </p>
                <div className="flex flex-wrap gap-2">
                  {TRENDING.map((term) => (
                    <button key={term} onClick={() => setQuery(term)}
                      className="px-3 py-1.5 border border-border rounded-sm font-mono text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-white/[0.03] transition-all"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Loading */}
          {!isImageMode && query && loading && debouncedQuery.length >= 2 && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="py-12 flex flex-col items-center gap-3"
            >
              <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="font-mono text-xs text-muted-foreground">Scanning catalog…</p>
            </motion.div>
          )}

          {/* Text results */}
          {!isImageMode && !loading && suggestions.length > 0 && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="px-5 py-2.5 border-b border-border/50 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {suggestions.length} result{suggestions.length !== 1 ? "s" : ""} found
                </span>
                <span className="font-mono text-[10px] text-muted-foreground/60">↑↓ navigate · ↵ select</span>
              </div>
              {suggestions.map((s, i) => (
                <ProductResultCard key={s.id} product={s} isActive={i === activeIdx} onClick={() => onClose?.()} idx={i} />
              ))}
              <Link
                to={`/products?search=${encodeURIComponent(query)}`} onClick={onClose}
                className="flex items-center justify-center gap-2 px-5 py-3.5 border-t border-border font-mono text-xs text-primary hover:bg-primary/5 transition-colors group"
              >
                View all results for <span className="font-bold">"{query}"</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          )}

          {/* No results + similar */}
          {!isImageMode && !loading && noResults && (
            <motion.div key="noresults" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
                    <ProductResultCard key={s.id} product={s} isActive={i === activeIdx} onClick={() => onClose?.()} idx={i} />
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
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground/40">
          <Camera className="w-3 h-3" />
          <span>image search</span>
          <span className="opacity-30">·</span>
          <Command className="w-3 h-3" />
          <span>AXIOMCRAFT</span>
        </div>
      </div>
    </div>
  );
}
