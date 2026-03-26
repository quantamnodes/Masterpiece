import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { useListProducts, useListCategories } from "@workspace/api-client-react";
import { ProductCard, ProductCardSkeleton } from "@/components/ProductCard";
import { Filter, SlidersHorizontal, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type SortOption = "newest" | "price_asc" | "price_desc" | "name_asc";

const SORT_OPTIONS: SortOption[] = ["newest", "price_asc", "price_desc", "name_asc"];

function isSortOption(value: string): value is SortOption {
  return (SORT_OPTIONS as string[]).includes(value);
}

export default function Products() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialCategory = searchParams.get('category') || undefined;

  const [category, setCategory] = useState<string | undefined>(initialCategory);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Sync state when URL changes externally
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCategory(params.get('category') || undefined);
  }, [location]);

  const { data: categoriesData } = useListCategories();
  
  const { data: productsData, isLoading, isFetching } = useListProducts({
    category,
    inStockOnly: inStockOnly ? true : undefined,
    sortBy
  });

  const clearFilters = () => {
    setCategory(undefined);
    setInStockOnly(false);
    window.history.pushState({}, '', '/products');
  };

  const FilterSidebar = () => (
    <div className="space-y-8">
      <div>
        <h3 className="font-heading font-bold uppercase tracking-wider mb-4 border-b border-border pb-2 flex justify-between items-center">
          Categories
          {category && (
            <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-primary normal-case font-mono">
              Clear
            </button>
          )}
        </h3>
        <ul className="space-y-2 font-mono text-sm">
          <li>
            <button
              onClick={() => {
                setCategory(undefined);
                window.history.pushState({}, '', '/products');
              }}
              className={`w-full text-left flex justify-between py-1 transition-colors ${!category ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <span>ALL HARDWARE</span>
            </button>
          </li>
          {categoriesData?.categories.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => {
                  setCategory(c.slug);
                  window.history.pushState({}, '', `/products?category=${c.slug}`);
                }}
                className={`w-full text-left flex justify-between py-1 transition-colors ${category === c.slug ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <span className="uppercase">{c.name}</span>
                <span className="text-xs opacity-50">[{c.count}]</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="font-heading font-bold uppercase tracking-wider mb-4 border-b border-border pb-2">Status</h3>
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative flex items-center justify-center w-5 h-5 border border-border bg-background rounded-sm group-hover:border-primary transition-colors">
            <input 
              type="checkbox" 
              className="sr-only" 
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
            />
            {inStockOnly && <div className="w-3 h-3 bg-primary rounded-sm" />}
          </div>
          <span className="font-mono text-sm text-muted-foreground group-hover:text-foreground transition-colors uppercase">In Stock Only</span>
        </label>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl md:text-6xl font-heading font-bold uppercase tracking-tighter mb-2">
              Hardware <span className="text-primary">Catalog</span>
            </h1>
            <p className="text-muted-foreground font-mono">
              {productsData?.total || 0} COMPONENTS FOUND IN DATABASE
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button 
              className="md:hidden flex items-center gap-2 px-4 py-2 border border-border rounded-sm font-mono text-sm"
              onClick={() => setMobileFiltersOpen(true)}
            >
              <Filter className="w-4 h-4" /> FILTERS
            </button>
            
            <div className="flex items-center gap-2 border border-border bg-card rounded-sm px-3 py-2">
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
              <select 
                value={sortBy}
                onChange={(e) => { if (isSortOption(e.target.value)) setSortBy(e.target.value); }}
                className="bg-transparent text-sm font-mono uppercase text-foreground focus:outline-none cursor-pointer appearance-none pr-4"
              >
                <option value="newest">Newest First</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="name_asc">Name: A to Z</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-12">
          {/* Desktop Sidebar */}
          <aside className="hidden md:block w-64 shrink-0">
            <FilterSidebar />
          </aside>

          {/* Main Grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array(6).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)}
              </div>
            ) : productsData?.products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-sm bg-card/30">
                <div className="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
                  <X className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-heading text-xl font-bold uppercase mb-2">No components found</h3>
                <p className="text-muted-foreground font-mono text-sm mb-6">Adjust your search parameters to locate hardware.</p>
                <button onClick={clearFilters} className="text-primary font-mono text-sm hover:underline uppercase">Reset Filters</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 relative">
                {/* Optional overlay when refetching via filters */}
                {isFetching && !isLoading && (
                  <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-sm">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                
                {productsData?.products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      <AnimatePresence>
        {mobileFiltersOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 md:hidden"
              onClick={() => setMobileFiltersOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
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
