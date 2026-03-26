import { useState } from "react";
import { useParams, Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { useGetProduct, useGetRelatedProducts } from "@workspace/api-client-react";
import { useCartManager } from "@/hooks/use-cart-manager";
import { ProductCard } from "@/components/ProductCard";
import { ShoppingCart, ChevronLeft, ShieldCheck, Truck, Cpu } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function ProductDetail() {
  const { id } = useParams();
  const productId = parseInt(id || "0", 10);
  
  const { data: product, isLoading, error } = useGetProduct(productId);
  const { data: relatedData } = useGetRelatedProducts(productId);
  
  const { addToCart, isAdding } = useCartManager();
  const { toast } = useToast();

  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<number | undefined>(undefined);

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-20 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="aspect-square bg-muted/50 rounded-sm" />
            <div className="space-y-6">
              <div className="h-10 bg-muted/50 rounded w-3/4" />
              <div className="h-6 bg-muted/50 rounded w-1/4" />
              <div className="h-32 bg-muted/50 rounded w-full" />
              <div className="h-12 bg-muted/50 rounded w-full" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !product) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
          <Cpu className="w-16 h-16 text-muted-foreground mb-6" />
          <h1 className="text-3xl font-heading font-bold uppercase mb-2">Component Missing</h1>
          <p className="text-muted-foreground font-mono mb-8">The requested hardware could not be located in the database.</p>
          <Link href="/products">
            <button className="px-6 py-3 border border-primary text-primary font-mono text-sm uppercase hover:bg-primary hover:text-primary-foreground transition-colors">
              Return to Catalog
            </button>
          </Link>
        </div>
      </Layout>
    );
  }

  const isOutOfStock = product.stock <= 0;
  const imageUrl = product.imageUrl || `https://picsum.photos/seed/${product.slug}/800/800`;
  
  // Calculate price based on variant if applicable
  const activeVariant = product.variants?.find(v => v.id === selectedVariantId);
  const currentPrice = product.salePrice 
    ? product.salePrice + (activeVariant?.priceModifier || 0)
    : product.basePrice + (activeVariant?.priceModifier || 0);

  // Set default variant if variants exist and none selected
  if (product.variants?.length > 0 && selectedVariantId === undefined) {
    setSelectedVariantId(product.variants[0].id);
  }

  const handleAddToCart = async () => {
    if (isOutOfStock) return;
    try {
      await addToCart(product.id, quantity, selectedVariantId);
      toast({
        title: "Integration Successful",
        description: `${quantity}x ${product.name} added to loadout.`,
        className: "bg-card border-primary",
      });
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to add to loadout.",
        variant: "destructive"
      });
    }
  };

  return (
    <Layout>
      <div className="bg-muted/30 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/products" className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-primary transition-colors uppercase">
            <ChevronLeft className="w-4 h-4" /> Back to Catalog
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 mb-24">
          
          {/* Image Gallery */}
          <div className="relative">
            <div className="sticky top-28">
              <div className="aspect-square bg-card border border-border rounded-sm overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent z-10 pointer-events-none" />
                <img 
                  src={imageUrl} 
                  alt={product.name}
                  className="w-full h-full object-cover mix-blend-luminosity group-hover:mix-blend-normal transition-all duration-700"
                />
                
                <div className="absolute top-4 left-4 z-20 flex gap-2">
                  {product.badge && (
                    <span className="px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider bg-primary text-primary-foreground rounded-sm shadow-[0_0_15px_rgba(0,240,255,0.3)]">
                      {product.badge}
                    </span>
                  )}
                  {isOutOfStock && (
                    <span className="px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider bg-destructive text-destructive-foreground rounded-sm">
                      OUT OF STOCK
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Product Info */}
          <div className="flex flex-col pt-4">
            <div className="mb-2">
              <span className="text-primary font-mono text-sm uppercase tracking-widest">{product.category}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-heading font-bold uppercase tracking-tighter mb-4">
              {product.name}
            </h1>
            <p className="text-xl text-muted-foreground font-sans mb-8">
              {product.shortDescription}
            </p>

            <div className="flex items-end gap-4 mb-8 pb-8 border-b border-border">
              <span className="text-4xl font-mono font-bold text-foreground">
                ${currentPrice.toLocaleString()}
              </span>
              {product.salePrice && !activeVariant && (
                <span className="text-xl font-mono text-muted-foreground line-through pb-1">
                  ${product.basePrice.toLocaleString()}
                </span>
              )}
            </div>

            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
              <div className="mb-8">
                <h3 className="font-mono text-sm uppercase text-muted-foreground mb-3">Configuration</h3>
                <div className="flex flex-wrap gap-3">
                  {product.variants.map(variant => (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariantId(variant.id)}
                      className={`px-4 py-2 font-mono text-sm border rounded-sm transition-all ${
                        selectedVariantId === variant.id 
                          ? 'border-primary bg-primary/10 text-primary box-glow' 
                          : 'border-border bg-card text-foreground hover:border-primary/50'
                      }`}
                    >
                      {variant.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-4 mb-10">
              <div className="flex gap-4">
                <div className="flex items-center border border-border bg-card rounded-sm w-32">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="flex-1 py-4 text-muted-foreground hover:text-primary font-mono"
                    disabled={isOutOfStock}
                  >-</button>
                  <span className="w-10 text-center font-mono font-bold">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="flex-1 py-4 text-muted-foreground hover:text-primary font-mono"
                    disabled={isOutOfStock}
                  >+</button>
                </div>
                
                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock || isAdding}
                  className="flex-1 bg-primary text-primary-foreground font-heading font-bold uppercase tracking-wider rounded-sm hover:bg-primary/90 hover:box-glow transition-all disabled:opacity-50 disabled:bg-muted disabled:text-muted-foreground flex items-center justify-center gap-3"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {isOutOfStock ? "Depleted" : isAdding ? "Processing..." : "Acquire Component"}
                </button>
              </div>
              
              {!isOutOfStock && product.stock <= 5 && (
                <p className="text-orange-400 font-mono text-sm flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                  Critical Stock Level: Only {product.stock} units remain.
                </p>
              )}
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 gap-4 py-6 border-y border-border mb-12">
              <div className="flex items-center gap-3 text-muted-foreground">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <span className="text-sm font-mono">5-Year Warranty</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Truck className="w-5 h-5 text-primary" />
                <span className="text-sm font-mono">Express Delivery</span>
              </div>
            </div>

            {/* Details & Specs */}
            <div className="space-y-10">
              <div>
                <h3 className="text-2xl font-heading font-bold uppercase mb-4">Architecture Overview</h3>
                <div className="prose prose-invert max-w-none text-muted-foreground font-sans leading-relaxed">
                  <p>{product.description}</p>
                </div>
              </div>

              {product.specs && product.specs.length > 0 && (
                <div>
                  <h3 className="text-2xl font-heading font-bold uppercase mb-4">Technical Specifications</h3>
                  <div className="border border-border rounded-sm overflow-hidden bg-card">
                    {product.specs.map((spec, i) => (
                      <div key={i} className={`flex flex-col sm:flex-row border-b border-border/50 last:border-0 ${i % 2 === 0 ? 'bg-muted/20' : ''}`}>
                        <div className="sm:w-1/3 py-3 px-4 font-mono text-xs uppercase text-muted-foreground border-r-0 sm:border-r border-border/50">
                          {spec.name}
                        </div>
                        <div className="sm:w-2/3 py-3 px-4 font-mono text-sm text-foreground">
                          {spec.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
          </div>
        </div>

        {/* Cross Sell */}
        {relatedData && relatedData.products.length > 0 && (
          <div className="border-t border-border pt-16">
            <h2 className="text-3xl font-heading font-bold uppercase tracking-tight mb-8">Compatible Architecture</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedData.products.slice(0, 4).map(relatedProduct => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
