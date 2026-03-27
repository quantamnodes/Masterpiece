import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ChevronRight } from "lucide-react";
import { useRecentlyViewedStore } from "@/store/recently-viewed-store";

export function RecentlyViewedCarousel() {
  const { items } = useRecentlyViewedStore();

  if (items.length === 0) return null;

  return (
    <section className="py-12 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <h2 className="font-heading font-bold uppercase text-sm tracking-widest text-muted-foreground">
              Recently Viewed
            </h2>
          </div>
          <Link to="/products" className="flex items-center gap-1 font-mono text-xs text-primary hover:underline">
            Browse All <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: "none" as const }}>
          <AnimatePresence initial={false}>
            {items.map((item, i) => {
              const price = item.salePrice ? parseFloat(item.salePrice) : parseFloat(item.basePrice);
              const imageUrl = item.imageUrl || `https://picsum.photos/seed/${item.slug}/400/300`;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="shrink-0 w-44"
                >
                  <Link to={`/products/${item.id}`} className="group block">
                    <div className="relative overflow-hidden rounded-sm bg-card border border-border group-hover:border-primary/40 transition-colors">
                      <img
                        src={imageUrl}
                        alt={item.name}
                        className="w-full h-28 object-cover mix-blend-luminosity group-hover:mix-blend-normal transition-all duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      {item.stock <= 0 && (
                        <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                          <span className="font-mono text-[10px] text-destructive uppercase tracking-wider">Out of Stock</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 px-0.5">
                      <p className="font-heading text-xs font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                        {item.name}
                      </p>
                      <p className="font-mono text-xs text-primary font-bold mt-0.5">
                        ${price.toLocaleString()}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
