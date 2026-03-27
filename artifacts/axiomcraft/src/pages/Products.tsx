import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { useListProducts, useListCategories } from "@workspace/api-client-react";
import { ProductCard, ProductCardSkeleton } from "@/components/ProductCard";
import { Filter, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Types ──────────────────────────────────────────────────────────────── */

type SortOption = "newest" | "price_asc" | "price_desc" | "name_asc";

const SORT_OPTIONS: SortOption[] = ["newest", "price_asc", "price_desc", "name_asc"];

const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest First",
  price_asc: "Price: Low → High",
  price_desc: "Price: High → Low",
  name_asc: "Name: A → Z",
};

function isSortOption(value: string): value is SortOption {
  return (SORT_OPTIONS as string[]).includes(value);
}

const API = import.meta.env.VITE_API_URL || `${import.meta.env.BASE_URL}api`;

/* ─── Filter Options Type ────────────────────────────────────────────────── */

interface FilterOptions {
  sockets: string[];
  formFactors: string[];
  wattages: string[];
  memorySpeeds: string[];
  storageCapacities: string[];
}

/* ─── Custom Debounce Hook ───────────────────────────────────────────────── */

/**
 * useDebounced — returns a debounced copy of `value` that only updates
 * once the value has been stable for `delay` ms.
 *
 * Used for price range inputs so the product list doesn't filter mid-type.
 */
function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/* ─── MultiSelectFilter ──────────────────────────────────────────────────── */

function MultiSelectFilter({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: string[];
  selected: string[];
  onToggle: (val: string) => void;
}) {
  const [open, setOpen] = useState(true);

  if (!options || options.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex justify-between items-center font-heading font-bold uppercase tracking-wider border-b border-border pb-2 mb-3"
      >
        <span>{title}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="space-y-2 font-mono text-sm">
          {options.map((opt) => {
            const checked = selected.includes(opt);
            return (
              <li key={opt}>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center w-4 h-4 border border-border bg-background rounded-sm hover:border-primary transition-colors shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => onToggle(opt)}
                    />
                    {checked && <div className="w-2.5 h-2.5 bg-primary rounded-sm" />}
                  </div>
                  <span className={`uppercase transition-colors ${checked ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                    {opt}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ─── MAIN PAGE ──────────────────────────────────────────────────────────── */

export default function Products() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialCategory = searchParams.get("category") || undefined;

  /* ── Filter state ── */
  const [category,                setCategory]                = useState<string | undefined>(initialCategory);
  const [inStockOnly,             setInStockOnly]             = useState(false);
  const [sortBy,                  setSortBy]                  = useState<SortOption>("newest");
  const [sortOpen,                setSortOpen]                = useState(false);
  const [selectedSockets,         setSelectedSockets]         = useState<string[]>([]);
  const [selectedFormFactors,     setSelectedFormFactors]     = useState<string[]>([]);
  const [selectedWattages,        setSelectedWattages]        = useState<string[]>([]);
  const [selectedMemorySpeeds,    setSelectedMemorySpeeds]    = useState<string[]>([]);
  const [selectedStorageCapacities, setSelectedStorageCapacities] = useState<string[]>([]);
  const [mobileFiltersOpen,       setMobileFiltersOpen]       = useState(false);

  /*
   * Price range — two-tier state so the filter never fires mid-type:
   *   priceMinDraft / priceMaxDraft  ← bound to input value (live)
   *   priceMin / priceMax            ← committed only on blur or Enter
   *
   * commitPriceMin/Max() copy draft → committed, which triggers filtering.
   */
  const [priceMinDraft, setPriceMinDraft] = useState<string>("");
  const [priceMaxDraft, setPriceMaxDraft] = useState<string>("");
  const [priceMin,      setPriceMin]      = useState<string>("");
  const [priceMax,      setPriceMax]      = useState<string>("");

  const applyPriceRange = () => { setPriceMin(priceMinDraft); setPriceMax(priceMaxDraft); };

  /* ── Dynamic filter options (fetched from API) ── */
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    sockets: [], formFactors: [], wattages: [], memorySpeeds: [], storageCapacities: [],
  });

  useEffect(() => {
    fetch(`${API}/products/filter-options`)
      .then((r) => r.json())
      .then((data: FilterOptions) => setFilterOptions(data))
      .catch(() => {/* ignore — falls back to empty arrays */});
  }, []);

  /* ── Sync category from URL ── */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setCategory(params.get("category") || undefined);
  }, [location.search]);

  /* ── Close sort dropdown on outside click ── */
  const sortRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Data fetching ── */
  const { data: categoriesData } = useListCategories();

  const { data: productsData, isLoading, isFetching } = useListProducts({
    category,
    inStockOnly: inStockOnly ? true : undefined,
    sortBy,
    socket: selectedSockets.length === 1 ? selectedSockets[0] : undefined,
    formFactor: selectedFormFactors.length === 1 ? selectedFormFactors[0] : undefined,
    wattage: selectedWattages.length === 1 ? selectedWattages[0] : undefined,
    memorySpeed: selectedMemorySpeeds.length === 1 ? selectedMemorySpeeds[0] : undefined,
    storageCapacity: selectedStorageCapacities.length === 1 ? selectedStorageCapacities[0] : undefined,
  });

  /* ── Client-side post-filter (multi-select + price) ── */
  type Spec = { name: string; value: string };
  const getSpecs = (p: { specs: unknown }): Spec[] =>
    Array.isArray(p.specs) ? (p.specs as Spec[]) : [];

  const priceMinNum = priceMin !== "" ? parseFloat(priceMin) : null;
  const priceMaxNum = priceMax !== "" ? parseFloat(priceMax) : null;

  const filteredProducts = useMemo(() => {
    if (!productsData?.products) return [];
    let list = productsData.products;

    if (selectedSockets.length > 1) {
      list = list.filter((p) =>
        selectedSockets.some((s) =>
          getSpecs(p).some((spec) => spec.name === "Socket" && spec.value === s),
        ),
      );
    }
    if (selectedFormFactors.length > 1) {
      list = list.filter((p) =>
        selectedFormFactors.some((ff) =>
          getSpecs(p).some((spec) => spec.name === "Form Factor" && spec.value === ff),
        ),
      );
    }
    if (selectedWattages.length > 1) {
      list = list.filter((p) =>
        selectedWattages.some((w) =>
          getSpecs(p).some((spec) => spec.name === "Wattage" && spec.value.includes(w)),
        ),
      );
    }
    if (selectedMemorySpeeds.length > 1) {
      list = list.filter((p) =>
        selectedMemorySpeeds.some((ms) =>
          getSpecs(p).some((spec) =>
            (spec.name === "Speed" || spec.name === "Memory Speed") && spec.value.includes(ms),
          ),
        ),
      );
    }
    if (selectedStorageCapacities.length > 1) {
      list = list.filter((p) =>
        selectedStorageCapacities.some((sc) =>
          getSpecs(p).some((spec) => spec.name === "Capacity" && spec.value.includes(sc)),
        ),
      );
    }
    if (priceMinNum !== null) {
      list = list.filter((p) => {
        const price = p.salePrice ? parseFloat(String(p.salePrice)) : parseFloat(String(p.basePrice));
        return price >= priceMinNum;
      });
    }
    if (priceMaxNum !== null) {
      list = list.filter((p) => {
        const price = p.salePrice ? parseFloat(String(p.salePrice)) : parseFloat(String(p.basePrice));
        return price <= priceMaxNum;
      });
    }
    return list;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productsData, selectedSockets, selectedFormFactors, selectedWattages, selectedMemorySpeeds, selectedStorageCapacities, priceMinNum, priceMaxNum]);

  /* ── Toggle helpers ── */
  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>) =>
    (val: string) => setter((prev) => prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val]);

  const toggleSocket          = toggle(setSelectedSockets);
  const toggleFormFactor      = toggle(setSelectedFormFactors);
  const toggleWattage         = toggle(setSelectedWattages);
  const toggleMemorySpeed     = toggle(setSelectedMemorySpeeds);
  const toggleStorageCapacity = toggle(setSelectedStorageCapacities);

  /* ── Active filter state helpers ── */
  const hasActiveFilters =
    !!category || inStockOnly ||
    selectedSockets.length > 0 || selectedFormFactors.length > 0 ||
    selectedWattages.length > 0 || selectedMemorySpeeds.length > 0 ||
    selectedStorageCapacities.length > 0 ||
    priceMinNum !== null || priceMaxNum !== null;

  const clearFilters = () => {
    setCategory(undefined);
    setInStockOnly(false);
    setSelectedSockets([]);
    setSelectedFormFactors([]);
    setSelectedWattages([]);
    setSelectedMemorySpeeds([]);
    setSelectedStorageCapacities([]);
    setPriceMinDraft("");
    setPriceMaxDraft("");
    setPriceMin("");
    setPriceMax("");
    window.history.pushState({}, "", "/products");
  };

  const activeFilterCount =
    (category ? 1 : 0) +
    selectedSockets.length + selectedFormFactors.length +
    selectedWattages.length + selectedMemorySpeeds.length +
    selectedStorageCapacities.length + (inStockOnly ? 1 : 0);

  /* ─────────────────────────────────────────────────────────────────────
     FILTER SIDEBAR
     Renders inside both the desktop aside and the mobile slide-over.
     ───────────────────────────────────────────────────────────────────── */
  const FilterSidebar = () => (
    <div className="space-y-8">

      {/* ── Categories ── */}
      <div>
        <div className="flex justify-between items-center border-b border-border pb-2 mb-3">
          <h3 className="font-heading font-bold uppercase tracking-wider">Categories</h3>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-muted-foreground hover:text-primary font-mono normal-case"
            >
              Clear All
            </button>
          )}
        </div>
        <ul className="space-y-2 font-mono text-sm">
          <li>
            <button
              onClick={() => { setCategory(undefined); window.history.pushState({}, "", "/products"); }}
              className={`w-full text-left flex justify-between py-1 transition-colors ${!category ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <span>ALL HARDWARE</span>
            </button>
          </li>
          {categoriesData?.categories.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => { setCategory(c.slug); window.history.pushState({}, "", `/products?category=${c.slug}`); }}
                className={`w-full text-left flex justify-between py-1 transition-colors ${category === c.slug ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <span className="uppercase">{c.name}</span>
                <span className="text-xs opacity-50">[{c.count}]</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Spec filters (fully dynamic — hidden when no options exist) ── */}
      <MultiSelectFilter
        title="Socket"
        options={filterOptions.sockets}
        selected={selectedSockets}
        onToggle={toggleSocket}
      />
      <MultiSelectFilter
        title="Form Factor"
        options={filterOptions.formFactors}
        selected={selectedFormFactors}
        onToggle={toggleFormFactor}
      />
      <MultiSelectFilter
        title="Wattage"
        options={filterOptions.wattages}
        selected={selectedWattages}
        onToggle={toggleWattage}
      />
      <MultiSelectFilter
        title="Memory Speed"
        options={filterOptions.memorySpeeds}
        selected={selectedMemorySpeeds}
        onToggle={toggleMemorySpeed}
      />
      <MultiSelectFilter
        title="Storage Capacity"
        options={filterOptions.storageCapacities}
        selected={selectedStorageCapacities}
        onToggle={toggleStorageCapacity}
      />

      {/* ── Price Range ── */}
      <div>
        <div className="w-full flex justify-between items-center font-heading font-bold uppercase tracking-wider border-b border-border pb-2 mb-3">
          <span>Price Range</span>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="font-mono text-[10px] uppercase text-muted-foreground mb-1 block">Min ($)</label>
              <input
                type="number"
                min={0}
                value={priceMinDraft}
                onChange={(e) => setPriceMinDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyPriceRange()}
                placeholder="0"
                className="w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <span className="text-muted-foreground font-mono text-xs mt-4">—</span>
            <div className="flex-1">
              <label className="font-mono text-[10px] uppercase text-muted-foreground mb-1 block">Max ($)</label>
              <input
                type="number"
                min={0}
                value={priceMaxDraft}
                onChange={(e) => setPriceMaxDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyPriceRange()}
                placeholder="∞"
                className="w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={applyPriceRange}
              className="flex-1 bg-primary text-background font-mono text-xs font-semibold uppercase tracking-widest py-2 rounded-sm hover:bg-primary/90 transition-colors"
            >
              Apply
            </button>
            {(priceMinDraft || priceMaxDraft) && (
              <button
                onClick={() => { setPriceMinDraft(""); setPriceMaxDraft(""); setPriceMin(""); setPriceMax(""); }}
                className="font-mono text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Availability ── */}
      <div>
        <h3 className="font-heading font-bold uppercase tracking-wider mb-3 border-b border-border pb-2">
          Availability
        </h3>
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative flex items-center justify-center w-4 h-4 border border-border bg-background rounded-sm hover:border-primary transition-colors">
            <input
              type="checkbox"
              className="sr-only"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
            />
            {inStockOnly && <div className="w-2.5 h-2.5 bg-primary rounded-sm" />}
          </div>
          <span className="font-mono text-sm text-muted-foreground hover:text-foreground transition-colors uppercase">
            In Stock Only
          </span>
        </label>
      </div>
    </div>
  );

  /* ─────────────────────────────────────────────────────────────────────
     PAGE RENDER
     ───────────────────────────────────────────────────────────────────── */
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">

        {/* Page header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl md:text-6xl font-heading font-bold uppercase tracking-tighter mb-2">
              Hardware <span className="text-primary">Catalog</span>
            </h1>
            <p className="text-muted-foreground font-mono">
              {filteredProducts.length || productsData?.total || 0} COMPONENTS FOUND IN DATABASE
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Mobile filter trigger */}
            <button
              className="md:hidden flex items-center gap-2 px-4 py-2 border border-border rounded-sm font-mono text-sm relative"
              onClick={() => setMobileFiltersOpen(true)}
            >
              <Filter className="w-4 h-4" /> FILTERS
              {activeFilterCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Sort dropdown */}
            <div ref={sortRef} className="relative">
              <button
                onClick={() => setSortOpen((o) => !o)}
                className="flex items-center gap-2 border border-border bg-card rounded-sm px-3 py-2 font-mono text-sm uppercase text-foreground hover:border-primary/50 transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
                <span>{SORT_LABELS[sortBy]}</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${sortOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {sortOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-full mt-1 z-50 min-w-[180px] bg-card border border-border rounded-sm shadow-lg overflow-hidden"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => { setSortBy(opt); setSortOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 font-mono text-sm uppercase transition-colors ${
                          sortBy === opt ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/50"
                        }`}
                      >
                        {SORT_LABELS[opt]}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Layout: sidebar + grid */}
        <div className="flex flex-col md:flex-row gap-12">
          <aside className="hidden md:block w-64 shrink-0">
            <FilterSidebar />
          </aside>

          <div className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array(6).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-sm bg-card/30">
                <div className="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
                  <X className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-heading text-xl font-bold uppercase mb-2">No components found</h3>
                <p className="text-muted-foreground font-mono text-sm mb-6">
                  Adjust your search parameters to locate hardware.
                </p>
                <button onClick={clearFilters} className="text-primary font-mono text-sm hover:underline uppercase">
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="relative">
                {isFetching && !isLoading && (
                  <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-sm">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 auto-rows-[220px] gap-4">
                  {filteredProducts.map((product, i) => {
                    const isBig  = i % 7 === 0;
                    const isTall = i % 7 === 3;
                    return (
                      <div key={product.id} className={`${isBig ? "col-span-2 row-span-2" : isTall ? "row-span-2" : "col-span-1 row-span-1"}`}>
                        <ProductCard product={product} fillContainer />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter slide-over */}
      <AnimatePresence>
        {mobileFiltersOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 md:hidden"
              onClick={() => setMobileFiltersOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 20 }}
              className="fixed inset-y-0 right-0 w-4/5 max-w-sm bg-card border-l border-border z-50 p-6 overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8 border-b border-border pb-4">
                <h2 className="font-heading font-bold text-xl uppercase">Filters</h2>
                <button onClick={() => setMobileFiltersOpen(false)} className="p-2 -mr-2 text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <FilterSidebar />
              <div className="mt-12 pt-6 border-t border-border">
                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  className="w-full py-3 bg-primary text-primary-foreground font-heading font-bold uppercase text-sm rounded-sm"
                >
                  Apply & Close
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Layout>
  );
}
