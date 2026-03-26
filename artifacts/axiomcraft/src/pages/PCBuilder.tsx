import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { useListProducts } from "@workspace/api-client-react";
import { Cpu, Monitor, MemoryStick, HardDrive, Zap, ShoppingCart, CheckCircle, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { useCartManager } from "@/hooks/use-cart-manager";
import { useToast } from "@/hooks/use-toast";

type BuildSlot = "cpu" | "gpu" | "motherboard" | "memory" | "storage" | "psu";

interface SelectedComponents {
  cpu?: number;
  gpu?: number;
  motherboard?: number;
  memory?: number;
  storage?: number;
  psu?: number;
}

const SLOT_CONFIG: Record<BuildSlot, { label: string; icon: React.ElementType; category: string; description: string }> = {
  cpu: { label: "Processor", icon: Cpu, category: "cpus", description: "The brain of your build" },
  gpu: { label: "Graphics Card", icon: Monitor, category: "gpus", description: "Drives every pixel" },
  motherboard: { label: "Motherboard", icon: Zap, category: "motherboards", description: "The foundation" },
  memory: { label: "Memory", icon: MemoryStick, category: "memory", description: "Fuel for workloads" },
  storage: { label: "Storage", icon: HardDrive, category: "storage", description: "Speed & capacity" },
  psu: { label: "Power Supply", icon: Zap, category: "psus", description: "Clean stable power" },
};

const PRESET_BUILDS = [
  {
    name: "NEURAL ENTRY",
    tier: "entry",
    description: "Solid 1080p gaming & productivity",
    color: "text-slate-400 border-slate-400/30 bg-slate-400/5",
    slots: ["cpu", "gpu", "motherboard", "memory", "storage"] as BuildSlot[],
    categoryMap: { cpu: "cpus", gpu: "gpus", motherboard: "motherboards", memory: "memory", storage: "storage" },
  },
  {
    name: "APEX WORKSTATION",
    tier: "flagship",
    description: "4K gaming + creative professional",
    color: "text-primary border-primary/30 bg-primary/5",
    slots: ["cpu", "gpu", "motherboard", "memory", "storage", "psu"] as BuildSlot[],
    categoryMap: { cpu: "cpus", gpu: "gpus", motherboard: "motherboards", memory: "memory", storage: "storage", psu: "psus" },
  },
  {
    name: "SERVER NODE",
    tier: "server",
    description: "Maximum core count & ECC support",
    color: "text-yellow-400 border-yellow-400/30 bg-yellow-400/5",
    slots: ["cpu", "motherboard", "memory", "storage", "psu"] as BuildSlot[],
    categoryMap: { cpu: "cpus", motherboard: "motherboards", memory: "memory", storage: "storage", psu: "psus" },
  },
];

function ComponentSlot({
  slot,
  selectedId,
  onSelect,
}: {
  slot: BuildSlot;
  selectedId?: number;
  onSelect: (id: number | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const cfg = SLOT_CONFIG[slot];
  const Icon = cfg.icon;

  const { data, isLoading } = useListProducts({ category: cfg.category, inStockOnly: true });
  const products = data?.products || [];
  const selected = products.find((p) => p.id === selectedId);

  return (
    <div className="border border-border bg-card rounded-sm overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-4 p-5 hover:bg-muted/20 transition-colors ${selected ? "border-b border-border" : ""}`}
      >
        <div className={`w-10 h-10 flex items-center justify-center rounded-sm border shrink-0 ${selected ? "border-primary/50 bg-primary/10" : "border-border bg-muted/20"}`}>
          <Icon className={`w-5 h-5 ${selected ? "text-primary" : "text-muted-foreground"}`} />
        </div>
        <div className="flex-1 text-left">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{cfg.label}</p>
          {selected ? (
            <p className="font-heading font-bold text-sm text-foreground">{selected.name}</p>
          ) : (
            <p className="font-sans text-sm text-muted-foreground">{cfg.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {selected && (
            <span className="font-mono text-sm font-bold text-primary">
              ${(selected.salePrice ?? selected.basePrice).toLocaleString()}
            </span>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
              {isLoading ? (
                <p className="font-mono text-xs text-muted-foreground text-center py-4">Loading...</p>
              ) : products.length === 0 ? (
                <p className="font-mono text-xs text-muted-foreground text-center py-4">No {cfg.label} available</p>
              ) : (
                <>
                  {selected && (
                    <button
                      onClick={() => { onSelect(undefined); setOpen(false); }}
                      className="w-full text-left px-3 py-2 font-mono text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      ✕ Remove selection
                    </button>
                  )}
                  {products.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { onSelect(p.id); setOpen(false); }}
                      className={`w-full flex items-center gap-3 p-3 rounded-sm text-left transition-colors ${p.id === selectedId ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/30 border border-transparent"}`}
                    >
                      <img
                        src={p.imageUrl || `https://picsum.photos/seed/${p.slug}/60/60`}
                        alt={p.name}
                        className="w-10 h-10 object-cover rounded-sm bg-muted shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-heading font-bold text-xs truncate">{p.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">{p.shortDescription?.slice(0, 50)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono text-xs font-bold text-primary">
                          ${(p.salePrice ?? p.basePrice).toLocaleString()}
                        </p>
                        {p.id === selectedId && <CheckCircle className="w-3.5 h-3.5 text-primary ml-auto mt-0.5" />}
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PCBuilder() {
  const [selected, setSelected] = useState<SelectedComponents>({});
  const { addToCart } = useCartManager();
  const { toast } = useToast();

  const slots: BuildSlot[] = ["cpu", "gpu", "motherboard", "memory", "storage", "psu"];

  const setSlot = (slot: BuildSlot, id: number | undefined) => {
    setSelected((s) => ({ ...s, [slot]: id }));
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  const handleAddAll = async () => {
    const ids = Object.values(selected).filter(Boolean) as number[];
    if (ids.length === 0) return;
    try {
      for (const id of ids) {
        await addToCart(id, 1);
      }
      toast({ title: "Build Added to Cart", description: `${ids.length} components queued for deployment.`, className: "bg-card border-primary" });
    } catch {
      toast({ title: "Error", description: "Failed to add some components.", variant: "destructive" });
    }
  };

  return (
    <Layout>
      <section className="relative pt-28 pb-12 border-b border-border overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(0,240,255,0.06),transparent_60%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="inline-flex items-center gap-2 px-3 py-1 border border-primary/30 bg-primary/5 rounded-sm mb-6">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-mono tracking-widest text-primary uppercase">Build Configurator</span>
          </motion.div>
          <div className="max-w-3xl">
            {"BUILD YOUR RIG".split(" ").map((w, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className={`inline-block mr-4 text-5xl md:text-7xl font-heading font-bold uppercase tracking-tighter ${i === 2 ? "text-primary" : ""}`}
              >
                {w}
              </motion.span>
            ))}
          </div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-4 text-muted-foreground font-mono">
            Select your components below or start from a pre-configured build.
          </motion.p>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Preset builds */}
          <div className="mb-10">
            <h2 className="text-xl font-heading font-bold uppercase mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> Pre-Configured Builds
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PRESET_BUILDS.map((preset) => (
                <motion.div
                  key={preset.name}
                  whileHover={{ y: -4 }}
                  className={`border rounded-sm p-6 cursor-pointer ${preset.color} transition-all`}
                  onClick={() => toast({ title: `${preset.name} loaded`, description: "Select individual components below to customize.", className: "bg-card border-primary" })}
                >
                  <h3 className="font-heading font-bold uppercase text-lg mb-1">{preset.name}</h3>
                  <p className="font-mono text-xs text-muted-foreground mb-3">{preset.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {preset.slots.map((s) => (
                      <span key={s} className="font-mono text-xs px-2 py-0.5 bg-background/50 border border-border rounded-sm text-muted-foreground">
                        {SLOT_CONFIG[s].label}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Component slots */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xl font-heading font-bold uppercase mb-4">Select Components</h2>
              {slots.map((slot) => (
                <ComponentSlot
                  key={slot}
                  slot={slot}
                  selectedId={selected[slot]}
                  onSelect={(id) => setSlot(slot, id)}
                />
              ))}
            </div>

            {/* Build summary */}
            <div className="lg:sticky lg:top-28 space-y-4 h-fit">
              <div className="border border-border bg-card rounded-sm p-6">
                <h3 className="text-xl font-heading font-bold uppercase mb-4">Build Summary</h3>
                <div className="space-y-3 mb-6">
                  {slots.map((slot) => {
                    const id = selected[slot];
                    const cfg = SLOT_CONFIG[slot];
                    return (
                      <div key={slot} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <cfg.icon className={`w-4 h-4 shrink-0 ${id ? "text-primary" : "text-muted-foreground/40"}`} />
                          <span className="font-mono text-xs text-muted-foreground truncate">{cfg.label}</span>
                        </div>
                        {id ? (
                          <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground/40">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-border pt-4 mb-6">
                  <div className="flex justify-between font-mono text-sm text-muted-foreground mb-1">
                    <span>{selectedCount} / {slots.length} components</span>
                  </div>
                </div>

                <motion.button
                  onClick={handleAddAll}
                  disabled={selectedCount === 0}
                  whileHover={selectedCount > 0 ? { scale: 1.02 } : {}}
                  whileTap={selectedCount > 0 ? { scale: 0.98 } : {}}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-primary-foreground font-heading font-bold uppercase tracking-wider rounded-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {selectedCount === 0 ? "Select Components" : `Add ${selectedCount} to Cart`}
                </motion.button>
              </div>

              <div className="border border-primary/20 bg-primary/5 rounded-sm p-4">
                <p className="font-mono text-xs text-primary uppercase tracking-widest mb-2">Compatibility Note</p>
                <p className="font-mono text-xs text-muted-foreground">All components are validated for cross-compatibility before shipping. Contact us for build consultation.</p>
                <Link to="/contact" className="inline-flex items-center gap-1 font-mono text-xs text-primary mt-2 hover:underline">
                  Talk to an engineer →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
