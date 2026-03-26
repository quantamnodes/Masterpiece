import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
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

export function SearchBar({ onClose }: { onClose?: () => void }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [similar, setSimilar] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/products?search=${encodeURIComponent(query.trim())}`);
      onClose?.();
    }
  };

  const noResults = debouncedQuery.length >= 2 && !loading && suggestions.length === 0;

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="flex items-center gap-3 bg-card border border-border rounded-sm px-4 py-3 focus-within:border-primary transition-colors">
        <Search className="w-5 h-5 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search hardware — GPU, CPU, RAM, SSD..."
          className="flex-1 bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
        />
        {query && (
          <button type="button" onClick={() => { setQuery(""); setSuggestions([]); }}>
            <X className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
          </button>
        )}
        {loading && (
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0" />
        )}
      </form>

      <AnimatePresence>
        {(suggestions.length > 0 || noResults) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-sm shadow-2xl z-50 overflow-hidden"
          >
            {suggestions.length > 0 && (
              <>
                <div className="px-4 py-2 border-b border-border">
                  <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Results</span>
                </div>
                {suggestions.map((s) => (
                  <Link
                    key={s.id}
                    to={`/products/${s.id}`}
                    onClick={onClose}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors group"
                  >
                    <img
                      src={s.imageUrl || `https://picsum.photos/seed/${s.slug}/80/80`}
                      alt={s.name}
                      className="w-10 h-10 object-cover rounded-sm bg-muted shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-heading font-bold text-sm group-hover:text-primary transition-colors truncate">{s.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{s.category}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {s.salePrice ? (
                        <>
                          <p className="font-mono text-sm font-bold text-primary">${s.salePrice}</p>
                          <p className="font-mono text-xs text-muted-foreground line-through">${s.basePrice}</p>
                        </>
                      ) : (
                        <p className="font-mono text-sm font-bold">${s.basePrice}</p>
                      )}
                    </div>
                  </Link>
                ))}
                <Link
                  to={`/products?search=${encodeURIComponent(query)}`}
                  onClick={onClose}
                  className="block px-4 py-3 text-center font-mono text-xs text-primary hover:bg-primary/5 transition-colors border-t border-border"
                >
                  View all results for "{query}" →
                </Link>
              </>
            )}

            {noResults && (
              <>
                <div className="px-4 py-6 text-center">
                  <p className="font-mono text-sm text-muted-foreground mb-1">No results for <span className="text-foreground">"{query}"</span></p>
                  <p className="font-mono text-xs text-muted-foreground">You might like these instead:</p>
                </div>
                {similar.map((s) => (
                  <Link
                    key={s.id}
                    to={`/products/${s.id}`}
                    onClick={onClose}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors group border-t border-border"
                  >
                    <img
                      src={s.imageUrl || `https://picsum.photos/seed/${s.slug}/80/80`}
                      alt={s.name}
                      className="w-10 h-10 object-cover rounded-sm bg-muted shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-heading font-bold text-sm group-hover:text-primary transition-colors truncate">{s.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{s.category}</p>
                    </div>
                    <p className="font-mono text-sm font-bold shrink-0">${s.basePrice}</p>
                  </Link>
                ))}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
