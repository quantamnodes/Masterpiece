/**
 * CurrencySelector — compact dropdown for switching display currency.
 * Reads rates from localization-store, persists selection across sessions.
 */
import { useState, useRef, useEffect } from "react";
import { ChevronDown, DollarSign } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocalizationStore } from "@/stores/localization-store";
import { cn } from "@/lib/utils";

const POPULAR = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "INR", "SGD", "AED"];

export function CurrencySelector() {
  const { currency, rates, setCurrency, loadRates } = useLocalizationStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { loadRates(); }, [loadRates]);

  /* Close on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const info = rates[currency];
  const allCodes = Object.keys(rates);
  const popular = POPULAR.filter(c => allCodes.includes(c));
  const rest = allCodes.filter(c => !POPULAR.includes(c)).sort();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono text-muted-foreground hover:text-foreground border border-transparent hover:border-border/60 rounded-sm transition-all"
        title="Switch currency"
      >
        <span className="text-sm">{info?.flag ?? "💱"}</span>
        <span>{currency}</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1 w-52 bg-card border border-border rounded-sm shadow-2xl z-[999] overflow-hidden"
          >
            <div className="max-h-72 overflow-y-auto scrollbar-dark">
              <div className="px-3 py-2 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest">
                Popular
              </div>
              {popular.map(code => {
                const c = rates[code]!;
                return (
                  <CurrencyOption
                    key={code} code={code} info={c}
                    selected={currency === code}
                    onSelect={() => { setCurrency(code); setOpen(false); }}
                  />
                );
              })}
              {rest.length > 0 && (
                <>
                  <div className="px-3 py-2 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest border-t border-border mt-1 pt-2">
                    All Currencies
                  </div>
                  {rest.map(code => {
                    const c = rates[code]!;
                    return (
                      <CurrencyOption
                        key={code} code={code} info={c}
                        selected={currency === code}
                        onSelect={() => { setCurrency(code); setOpen(false); }}
                      />
                    );
                  })}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CurrencyOption({ code, info, selected, onSelect }: {
  code: string;
  info: { symbol: string; name: string; rate: number; flag: string };
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left",
        selected ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
      )}
    >
      <span className="text-base leading-none">{info.flag}</span>
      <div className="flex-1 min-w-0">
        <div className="font-mono text-xs font-semibold leading-none">{code}</div>
        <div className="text-[10px] text-muted-foreground leading-tight truncate">{info.name}</div>
      </div>
      <span className="font-mono text-xs text-muted-foreground">{info.symbol}</span>
    </button>
  );
}
