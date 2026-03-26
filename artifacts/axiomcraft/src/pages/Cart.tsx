import { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { useCartManager } from "@/hooks/use-cart-manager";
import { Trash2, ArrowRight, ShieldAlert, Cpu, Bell, BellRing } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Cart() {
  const { cart, isLoading, isUpdating, updateQuantity, removeItem, clearCart } = useCartManager();
  const { toast } = useToast();
  const [notifiedItems, setNotifiedItems] = useState<Set<number>>(new Set());

  const handleNotifyMe = (itemId: number, productName: string) => {
    setNotifiedItems((prev) => new Set(prev).add(itemId));
    toast({
      title: "Restock Alert Set",
      description: `You'll be notified when ${productName} becomes available.`,
      className: "bg-card border-primary",
    });
  };

  const handleUpdateQuantity = async (itemId: number, newQty: number) => {
    if (newQty < 1) return;
    try {
      await updateQuantity(itemId, newQty);
    } catch (e) {
      toast({ title: "Error", description: "Could not update quantity", variant: "destructive" });
    }
  };

  const handleRemove = async (itemId: number) => {
    try {
      await removeItem(itemId);
      toast({ title: "Component Removed", description: "Item purged from loadout" });
    } catch (e) {
      toast({ title: "Error", description: "Could not remove item", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-20 flex justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 min-h-[70vh]">
        <h1 className="text-4xl md:text-5xl font-heading font-bold uppercase tracking-tighter mb-2">
          System <span className="text-primary">Loadout</span>
        </h1>
        <p className="text-muted-foreground font-mono mb-12">
          SESSION ID: {cart?.sessionId.split('-')[0].toUpperCase() || "UNINITIALIZED"} // {cart?.itemCount || 0} COMPONENTS
        </p>

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border rounded-sm bg-card/30">
            <Cpu className="w-16 h-16 text-muted-foreground mb-6 opacity-50" />
            <h2 className="font-heading text-2xl font-bold uppercase mb-2">Loadout is empty</h2>
            <p className="text-muted-foreground font-mono text-sm mb-8">No hardware has been selected for integration.</p>
            <Link href="/products">
              <button className="px-8 py-4 bg-primary text-primary-foreground font-heading font-bold uppercase tracking-wider text-sm rounded-sm hover:bg-primary/90 transition-all box-glow">
                Browse Catalog
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            
            {/* Cart Items List */}
            <div className="lg:col-span-2 space-y-6">
              <div className="hidden sm:grid grid-cols-12 gap-4 pb-4 border-b border-border text-xs font-mono text-muted-foreground uppercase tracking-wider">
                <div className="col-span-6">Component</div>
                <div className="col-span-3 text-center">Quantity</div>
                <div className="col-span-2 text-right">Total</div>
                <div className="col-span-1"></div>
              </div>

              <div className={`space-y-6 ${isUpdating ? 'opacity-50 pointer-events-none' : ''} transition-opacity`}>
                {cart.items.map((item) => (
                  <div key={item.id} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-card p-4 rounded-sm border border-border">
                    
                    {/* Product Info */}
                    <div className="sm:col-span-6 flex items-center gap-4">
                      <div className="w-20 h-20 bg-muted shrink-0 rounded-sm overflow-hidden relative">
                        <img 
                          src={item.product.imageUrl || `https://picsum.photos/seed/${item.product.slug}/200/200`} 
                          alt={item.product.name}
                          className={`w-full h-full object-cover mix-blend-luminosity ${item.product.stock <= 0 ? 'opacity-40' : ''}`}
                        />
                        {item.product.stock <= 0 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-destructive/90 text-destructive-foreground px-1 py-0.5">OUT OF STOCK</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-mono text-primary uppercase">{item.product.category}</span>
                        <Link href={`/products/${item.product.id}`} className="font-heading font-bold uppercase text-lg hover:text-primary transition-colors line-clamp-1">
                          {item.product.name}
                        </Link>
                        {item.variantName && (
                          <span className="text-xs font-mono text-muted-foreground">Config: {item.variantName}</span>
                        )}
                        <span className="sm:hidden mt-1 font-mono font-bold">${item.unitPrice.toLocaleString()}</span>
                        {item.product.stock <= 0 && (
                          <button
                            onClick={() => handleNotifyMe(item.id, item.product.name)}
                            disabled={notifiedItems.has(item.id)}
                            className={`mt-1 inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider transition-colors w-fit ${
                              notifiedItems.has(item.id)
                                ? 'text-primary cursor-default'
                                : 'text-muted-foreground hover:text-primary cursor-pointer'
                            }`}
                          >
                            {notifiedItems.has(item.id)
                              ? <><BellRing className="w-3 h-3" /> Alert Active</>
                              : <><Bell className="w-3 h-3" /> Notify Me</>
                            }
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="sm:col-span-3 flex justify-center">
                      <div className={`flex items-center border border-border bg-background rounded-sm ${item.product.stock <= 0 ? 'opacity-40 pointer-events-none' : ''}`}>
                        <button 
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          className="px-3 py-1 text-muted-foreground hover:text-primary font-mono transition-colors"
                        >-</button>
                        <span className="w-8 text-center font-mono text-sm">{item.quantity}</span>
                        <button 
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          className="px-3 py-1 text-muted-foreground hover:text-primary font-mono transition-colors"
                        >+</button>
                      </div>
                    </div>

                    {/* Price & Remove */}
                    <div className="hidden sm:block sm:col-span-2 text-right font-mono font-bold text-lg text-foreground">
                      ${item.totalPrice.toLocaleString()}
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <button 
                        onClick={() => handleRemove(item.id)}
                        className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-start">
                <button 
                  onClick={() => clearCart()}
                  className="text-xs font-mono uppercase text-muted-foreground hover:text-destructive flex items-center gap-2"
                >
                  <Trash2 className="w-3 h-3" /> Purge Entire Loadout
                </button>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-card border border-border p-6 rounded-sm sticky top-28">
                <h3 className="font-heading font-bold text-xl uppercase mb-6 border-b border-border pb-4">Resource Allocation</h3>
                
                <div className="space-y-4 font-mono text-sm mb-6">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="text-foreground">${cart.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Logistics</span>
                    <span>Calculated at checkout</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Taxes</span>
                    <span>Calculated at checkout</span>
                  </div>
                </div>

                <div className="flex justify-between items-end border-t border-border pt-6 mb-8">
                  <span className="font-heading font-bold uppercase">Estimated Total</span>
                  <span className="font-mono font-bold text-3xl text-primary text-glow">
                    ${cart.subtotal.toLocaleString()}
                  </span>
                </div>

                <button 
                  className="w-full py-4 bg-primary text-primary-foreground font-heading font-bold uppercase tracking-wider rounded-sm hover:bg-primary/90 transition-all box-glow flex justify-center items-center gap-2 group"
                  onClick={() => {
                    toast({
                      title: "Protocol Locked",
                      description: "Checkout integration requires backend Stripe connection.",
                      variant: "destructive"
                    });
                  }}
                >
                  Proceed to Checkout <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <div className="mt-6 flex items-start gap-3 p-4 bg-background border border-border/50 rounded-sm">
                  <ShieldAlert className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs font-mono text-muted-foreground leading-relaxed">
                    Transactions are secured via 256-bit quantum-resistant encryption protocols. Inventory is reserved for 15 minutes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
