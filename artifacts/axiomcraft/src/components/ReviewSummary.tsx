/**
 * ReviewSummary — AI-generated summary card for product reviews.
 * Fetches lazily when mounted. Shows a skeleton while loading.
 */
import { useState, useEffect } from "react";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API = `${import.meta.env.BASE_URL}api`;

interface Props {
  productId: number;
  reviewCount: number;
}

export function ReviewSummary({ productId, reviewCount }: Props) {
  const [summary, setSummary]   = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [fetched, setFetched]   = useState(false);

  useEffect(() => {
    if (reviewCount === 0 || fetched) return;
    setFetched(true);
    setLoading(true);
    fetch(`${API}/products/${productId}/review-summary`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.summary) setSummary(d.summary); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [productId, reviewCount, fetched]);

  if (reviewCount === 0 || (!loading && !summary)) return null;

  return (
    <div className="border border-primary/30 rounded-sm bg-primary/5 p-4 mb-6">
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-2 w-full text-left"
      >
        <Sparkles className="w-4 h-4 text-primary shrink-0" />
        <span className="font-heading text-sm font-semibold text-primary">AI Review Summary</span>
        <span className="ml-auto text-muted-foreground">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="summary-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-primary/20">
              {loading ? (
                <div className="space-y-2">
                  <div className="h-3 bg-primary/10 rounded animate-pulse w-full" />
                  <div className="h-3 bg-primary/10 rounded animate-pulse w-4/5" />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed">{summary}</p>
              )}
              <p className="text-[10px] text-muted-foreground/50 font-mono mt-2">
                Generated from {reviewCount} reviews · Powered by AI
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
