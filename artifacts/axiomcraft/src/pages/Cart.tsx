import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { useCartManager } from "@/hooks/use-cart-manager";
import {
  Trash2, ArrowRight, ShieldAlert, Cpu, Bell, BellRing,
  Truck, Store, CheckCircle2, Star, Lock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserStore } from "@/store/user-store";
import { motion, AnimatePresence } from "framer-motion";

const API = import.meta.env.VITE_API_URL || `${import.meta.env.BASE_URL}api`;
const DELIVERY_FEE = 15;

interface Branch { id: number; name: string; location: string; active: boolean; }

export default function Cart() {
  const { cart, isLoading, isUpdating, updateQuantity, removeItem, clearCart } = useCartManager();
  const { toast } = useToast();
  const { user } = useUserStore();
  const [notifiedItems, setNotifiedItems] = useState<Set<number>>(new Set());

  // BOPIS state
  const [fulfillment, setFulfillment] = useState<"delivery" | "pickup">("delivery");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");

  // CoD Escrow state
  const [escrow, setEscrow] = useState<{ enabled: boolean; highValueThreshold: number; commitmentFeePct: number } | null>(null);

  // Order placement
  const [placing, setPlacing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{ orderId: number; pointsEarned: number } | null>(null);

  useEffect(() => {
    fetch(`${API}/cod-escrow`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setEscrow(d); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${API}/branches`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const active = (d.branches || []).filter((b: Branch) => b.active);
        setBranches(active);
        if (active.length > 0) setSelectedBranchId(String(active[0].id));
      })
      .catch(() => {});
  }, []);

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
    } catch {
      toast({ title: "Error", description: "Could not update quantity", variant: "destructive" });
    }
  };

  const handleRemove = async (itemId: number) => {
    try {
      await removeItem(itemId);
      toast({ title: "Component Removed", description: "Item purged from loadout" });
    } catch {
      toast({ title: "Error", description: "Could not remove item", variant: "destructive" });
    }
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Create an account or sign in to place an order.", variant: "destructive" });
      return;
    }
    if (!cart || cart.items.length === 0) return;
    const fee = fulfillment === "delivery" ? DELIVERY_FEE : 0;
    const total = cart.subtotal + fee;

    setPlacing(true);
    try {
      const res = await fetch(`${API}/orders`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalAmount: total,
          itemCount: cart.itemCount,
          fulfillmentType: fulfillment,
          branchId: fulfillment === "pickup" ? selectedBranchId : null,
          deliveryFee: fee,
          cartItems: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        }),
      });
      if (!res.ok) throw new Error("Order failed");
      const data = await res.json();
      setOrderSuccess({ orderId: data.order.id, pointsEarned: data.pointsEarned || 0 });
      await clearCart();
    } catch {
      toast({ title: "Order Failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setPlacing(false);
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
  const deliveryFee = fulfillment === "delivery" ? DELIVERY_FEE : 0;
  const estimatedTotal = (cart?.subtotal || 0) + deliveryFee;

  // Order success state
  if (orderSuccess) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-6">
            <div className="w-20 h-20 bg-primary/10 border border-primary/30 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl font-heading font-bold uppercase">Order Confirmed</h1>
            <p className="font-mono text-sm text-muted-foreground">
              ORDER #{String(orderSuccess.orderId).padStart(6, "0")} — {fulfillment === "pickup" ? "PICKUP READY" : "DISPATCHED"}
            </p>
            {orderSuccess.pointsEarned > 0 && (
              <div className="flex items-center justify-center gap-2 px-4 py-3 bg-primary/10 border border-primary/30 rounded-sm font-mono text-sm text-primary">
                <Star className="w-4 h-4" />
                +{orderSuccess.pointsEarned} loyalty points earned
              </div>
            )}
            <div className="flex gap-4 justify-center pt-4">
              <Link to="/products" className="px-6 py-3 bg-primary text-primary-foreground font-heading font-bold uppercase text-sm rounded-sm hover:bg-primary/90 transition-colors">
                Continue Shopping
              </Link>
              <Link to="/account" className="px-6 py-3 border border-border text-foreground font-heading font-bold uppercase text-sm rounded-sm hover:border-primary/50 transition-colors">
                My Orders
              </Link>
            </div>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 min-h-[70vh]">
        <h1 className="text-4xl md:text-5xl font-heading font-bold uppercase tracking-tighter mb-2">
          System <span className="text-primary">Loadout</span>
        </h1>
        <p className="text-muted-foreground font-mono mb-12">
          SESSION ID: {cart?.sessionId.split("-")[0].toUpperCase() || "UNINITIALIZED"} // {cart?.itemCount || 0} COMPONENTS
        </p>

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border rounded-sm bg-card/30">
            <Cpu className="w-16 h-16 text-muted-foreground mb-6 opacity-50" />
            <h2 className="font-heading text-2xl font-bold uppercase mb-2">Loadout is empty</h2>
            <p className="text-muted-foreground font-mono text-sm mb-8">No hardware has been selected for integration.</p>
            <Link to="/products">
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

              <div className={`space-y-6 ${isUpdating ? "opacity-50 pointer-events-none" : ""} transition-opacity`}>
                {cart.items.map((item) => (
                  <div key={item.id} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-card p-4 rounded-sm border border-border">
                    {/* Product Info */}
                    <div className="sm:col-span-6 flex items-center gap-4">
                      <div className="w-20 h-20 bg-muted shrink-0 rounded-sm overflow-hidden relative">
                        <img
                          src={item.product.imageUrl || `https://picsum.photos/seed/${item.product.slug}/200/200`}
                          alt={item.product.name}
                          className={`w-full h-full object-cover mix-blend-luminosity ${item.product.stock <= 0 ? "opacity-40" : ""}`}
                        />
                        {item.product.stock <= 0 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-destructive/90 text-destructive-foreground px-1 py-0.5">OUT OF STOCK</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-mono text-primary uppercase">{item.product.category}</span>
                        <Link to={`/products/${item.product.id}`} className="font-heading font-bold uppercase text-lg hover:text-primary transition-colors line-clamp-1">
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
                              notifiedItems.has(item.id) ? "text-primary cursor-default" : "text-muted-foreground hover:text-primary cursor-pointer"
                            }`}
                          >
                            {notifiedItems.has(item.id) ? (
                              <><BellRing className="w-3 h-3" /> Alert Active</>
                            ) : (
                              <><Bell className="w-3 h-3" /> Notify Me</>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="sm:col-span-3 flex justify-center">
                      <div className={`flex items-center border border-border bg-background rounded-sm ${item.product.stock <= 0 ? "opacity-40 pointer-events-none" : ""}`}>
                        <button onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)} className="px-3 py-1 text-muted-foreground hover:text-primary font-mono transition-colors">-</button>
                        <span className="w-8 text-center font-mono text-sm">{item.quantity}</span>
                        <button onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)} className="px-3 py-1 text-muted-foreground hover:text-primary font-mono transition-colors">+</button>
                      </div>
                    </div>

                    {/* Price & Remove */}
                    <div className="hidden sm:block sm:col-span-2 text-right font-mono font-bold text-lg text-foreground">
                      ${item.totalPrice.toLocaleString()}
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <button onClick={() => handleRemove(item.id)} className="p-2 text-muted-foreground hover:text-destructive transition-colors" aria-label="Remove item">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-start">
                <button onClick={() => clearCart()} className="text-xs font-mono uppercase text-muted-foreground hover:text-destructive flex items-center gap-2">
                  <Trash2 className="w-3 h-3" /> Purge Entire Loadout
                </button>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-card border border-border p-6 rounded-sm sticky top-28 space-y-6">
                <h3 className="font-heading font-bold text-xl uppercase border-b border-border pb-4">Resource Allocation</h3>

                {/* Fulfillment Method */}
                <div>
                  <p className="font-mono text-xs uppercase text-muted-foreground mb-3 tracking-wider">Fulfillment Method</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setFulfillment("delivery")}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-sm border text-xs font-mono uppercase transition-colors ${
                        fulfillment === "delivery" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      <Truck className="w-4 h-4" />
                      Delivery
                      <span className="text-[10px]">+${DELIVERY_FEE}</span>
                    </button>
                    <button
                      onClick={() => setFulfillment("pickup")}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-sm border text-xs font-mono uppercase transition-colors ${
                        fulfillment === "pickup" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      <Store className="w-4 h-4" />
                      Pick Up
                      <span className="text-[10px]">Free</span>
                    </button>
                  </div>

                  <AnimatePresence>
                    {fulfillment === "pickup" && branches.length > 0 && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
                        <p className="font-mono text-xs text-muted-foreground mb-2">Select branch:</p>
                        <div className="space-y-1.5">
                          {branches.map((b) => (
                            <button
                              key={b.id}
                              onClick={() => setSelectedBranchId(String(b.id))}
                              className={`w-full text-left px-3 py-2 rounded-sm border font-mono text-xs transition-colors ${
                                selectedBranchId === String(b.id) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                              }`}
                            >
                              <span className="font-bold">{b.name}</span>
                              {b.location && <span className="ml-2 opacity-60">— {b.location}</span>}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Price breakdown */}
                <div className="space-y-3 font-mono text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="text-foreground">${cart.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{fulfillment === "delivery" ? "Delivery Fee" : "Pickup"}</span>
                    <span className={fulfillment === "pickup" ? "text-primary" : "text-foreground"}>
                      {fulfillment === "pickup" ? "Free" : `$${DELIVERY_FEE}`}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-end border-t border-border pt-4">
                  <span className="font-heading font-bold uppercase">Total</span>
                  <span className="font-mono font-bold text-3xl text-primary text-glow">
                    ${estimatedTotal.toLocaleString()}
                  </span>
                </div>

                {user && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-sm font-mono text-xs text-primary">
                    <Star className="w-3.5 h-3.5" />
                    Earn ~{Math.floor(estimatedTotal)} loyalty points
                  </div>
                )}

                {/* CoD Escrow Notice */}
                <AnimatePresence>
                  {fulfillment === "delivery" && escrow?.enabled && estimatedTotal >= escrow.highValueThreshold && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="border border-amber-400/30 bg-amber-400/5 rounded-sm p-3 space-y-1">
                        <div className="flex items-center gap-2 font-mono text-xs font-bold text-amber-400 uppercase">
                          <Lock className="w-3.5 h-3.5" /> High-Value Order — CoD Escrow
                        </div>
                        <p className="font-mono text-xs text-muted-foreground">
                          Orders over ${escrow.highValueThreshold.toLocaleString()} require a {escrow.commitmentFeePct}% digital commitment fee
                          (${Math.ceil(estimatedTotal * escrow.commitmentFeePct / 100).toLocaleString()}) to confirm Cash-on-Delivery.
                          This fee is fully refunded upon successful delivery.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={handlePlaceOrder}
                  disabled={placing}
                  className="w-full py-4 bg-primary text-primary-foreground font-heading font-bold uppercase tracking-wider rounded-sm hover:bg-primary/90 transition-all box-glow flex justify-center items-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {placing ? (
                    <><div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> Processing...</>
                  ) : (
                    <>Place Order <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                  )}
                </button>

                {!user && (
                  <p className="font-mono text-xs text-muted-foreground text-center">
                    <Link to="/account" className="text-primary hover:underline">Sign in</Link> to track your order & earn points
                  </p>
                )}

                <div className="flex items-start gap-3 p-4 bg-background border border-border/50 rounded-sm">
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
