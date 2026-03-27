import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, GitCompareArrows } from "lucide-react";
import { useCompareStore } from "@/store/compare-store";
import { useNavigate } from "react-router-dom";

export function CompareBar() {
  const { items, removeItem, clearAll } = useCompareStore();
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {items.length >= 1 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-primary/30 bg-card/95 backdrop-blur-md shadow-[0_-8px_40px_rgba(0,240,255,0.1)]"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
            <div className="flex items-center gap-2 text-primary">
              <GitCompareArrows className="w-4 h-4" />
              <span className="font-mono text-xs uppercase tracking-wider hidden sm:block">Compare</span>
            </div>

            <div className="flex-1 flex items-center gap-3 overflow-x-auto">
              {items.map((item) => {
                const imageUrl = item.imageUrl || `https://picsum.photos/seed/${item.slug}/80/60`;
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 bg-background border border-border rounded-sm px-2 py-1.5 shrink-0"
                  >
                    <img src={imageUrl} alt={item.name} className="w-8 h-8 object-cover rounded-sm" />
                    <span className="font-mono text-xs text-foreground max-w-[100px] truncate hidden sm:block">{item.name}</span>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}

              {items.length < 4 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-border rounded-sm font-mono text-xs text-muted-foreground shrink-0">
                  + Add {4 - items.length} more
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {items.length >= 2 && (
                <button
                  onClick={() => navigate("/compare")}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-heading font-bold uppercase text-xs rounded-sm hover:bg-primary/90 transition-colors"
                >
                  Compare <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={clearAll}
                className="px-3 py-2 border border-border text-muted-foreground hover:text-foreground font-mono text-xs rounded-sm transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
