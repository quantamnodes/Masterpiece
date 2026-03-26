import { Link } from 'react-router-dom';
import { type Product } from "@workspace/api-client-react";
import { ShoppingCart } from "lucide-react";
import { useCartManager } from "@/hooks/use-cart-manager";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export function ProductCard({ product, fillContainer = false }: { product: Product; fillContainer?: boolean }) {
  const { addToCart, isAdding } = useCartManager();
  const { toast } = useToast();

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (product.stock <= 0) return;
    
    try {
      await addToCart(product.id, 1);
      toast({
        title: "Added to Cart",
        description: `${product.name} initialized in matrix.`,
        className: "bg-card border-primary text-foreground",
      });
    } catch (error) {
      toast({
        title: "System Error",
        description: "Failed to allocate resources.",
        variant: "destructive",
      });
    }
  };

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;
  const imageUrl = product.imageUrl || `https://picsum.photos/seed/${product.slug}/800/600`;

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className={`group flex flex-col bg-card border border-border rounded-sm overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,240,255,0.1)] relative ${fillContainer ? "h-full" : ""}`}
      data-testid={`card-product-${product.id}`}
    >
      <Link to={`/products/${product.id}`} className="flex-1 flex flex-col relative outline-none h-full">
        
        {/* Image Container */}
        <div className={`relative bg-muted overflow-hidden ${fillContainer ? "flex-1" : "aspect-[4/3]"}`}>
          <img 
            src={imageUrl} 
            alt={product.name}
            className="w-full h-full object-cover mix-blend-luminosity group-hover:mix-blend-normal transition-all duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent opacity-80" />
          
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            <span className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider bg-background/80 backdrop-blur-sm border border-border text-muted-foreground rounded-sm">
              {product.category}
            </span>
            {product.badge && (
              <span className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider bg-primary/20 backdrop-blur-sm border border-primary/50 text-primary rounded-sm">
                {product.badge}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col shrink-0">
          <h3 className="font-heading font-semibold text-base line-clamp-1 mb-1 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              {product.salePrice ? (
                <>
                  <span className="text-xs font-mono text-muted-foreground line-through">
                    ${product.basePrice.toLocaleString()}
                  </span>
                  <span className="font-mono text-lg font-bold text-primary">
                    ${product.salePrice.toLocaleString()}
                  </span>
                </>
              ) : (
                <span className="font-mono text-lg font-bold">
                  ${product.basePrice.toLocaleString()}
                </span>
              )}
            </div>

            <div className="flex flex-col items-end gap-1">
              {isOutOfStock ? (
                <span className="text-xs font-mono text-destructive">OUT OF STOCK</span>
              ) : isLowStock ? (
                <span className="text-xs font-mono text-orange-400">ONLY {product.stock} LEFT</span>
              ) : (
                <span className="text-xs font-mono text-muted-foreground">IN STOCK</span>
              )}
            </div>
          </div>
        </div>
      </Link>

      {/* Quick Action overlay (visible on hover) */}
      <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out bg-gradient-to-t from-card via-card to-transparent pt-12">
        <button
          onClick={handleQuickAdd}
          disabled={isOutOfStock || isAdding}
          className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground font-heading font-bold uppercase tracking-wider text-sm rounded-sm hover:bg-primary/90 disabled:opacity-50 disabled:bg-muted disabled:text-muted-foreground transition-colors"
          data-testid={`btn-quick-add-${product.id}`}
        >
          <ShoppingCart className="w-4 h-4" />
          {isOutOfStock ? "Depleted" : isAdding ? "Processing..." : "Acquire"}
        </button>
      </div>
    </motion.div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col bg-card border border-border rounded-sm overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-muted/50" />
      <div className="p-5 flex flex-col flex-1 gap-4">
        <div className="space-y-2">
          <div className="h-5 bg-muted/50 rounded w-3/4" />
          <div className="h-5 bg-muted/50 rounded w-1/2" />
        </div>
        <div className="mt-auto flex justify-between items-end pt-4">
          <div className="h-6 bg-muted/50 rounded w-1/3" />
          <div className="h-4 bg-muted/50 rounded w-1/4" />
        </div>
      </div>
    </div>
  );
}
