/**
 * HoldForMeModal — lets a buyer reserve a product at a branch for 2 hours.
 * Shows:
 *   1. Branch selector
 *   2. Reserve button
 *   3. On success: OTP code + expiry countdown
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Clock, CheckCircle, Copy, AlertCircle } from "lucide-react";
import { useUserStore } from "@/store/user-store";
import { useToast } from "@/hooks/use-toast";

const API = `${import.meta.env.BASE_URL}api`;

interface Branch {
  id: number;
  name: string;
  location: string;
}

interface Reservation {
  id: number;
  otpCode: string;
  expiresAt: string;
  branchName: string;
  branchLocation: string;
  productName: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  productId: number;
  productName: string;
}

function useCountdown(expiresAt: string | null) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining("Expired"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h > 0 ? h + "h " : ""}${m}m ${s}s`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  return remaining;
}

export function HoldForMeModal({ open, onClose, productId, productName }: Props) {
  const { user } = useUserStore();
  const { toast } = useToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [error, setError] = useState("");
  const countdown = useCountdown(reservation?.expiresAt ?? null);

  useEffect(() => {
    if (!open) { setReservation(null); setError(""); return; }
    fetch(`${API}/branches`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { setBranches(d.branches || []); if (d.branches?.length) setSelectedBranch(d.branches[0].id); })
      .catch(() => {});
  }, [open]);

  const handleReserve = useCallback(async () => {
    if (!selectedBranch) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ productId, branchId: selectedBranch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setReservation(data.reservation);
    } catch (e: any) {
      setError(e.message || "Reservation failed");
    } finally {
      setLoading(false);
    }
  }, [productId, selectedBranch]);

  const copyOtp = () => {
    if (reservation?.otpCode) {
      navigator.clipboard.writeText(reservation.otpCode);
      toast({ title: "OTP Copied", description: "Show this code at the branch counter.", className: "bg-card border-primary text-foreground" });
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />
        {/* Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="relative bg-card border border-border rounded-sm p-6 w-full max-w-md z-10 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground">Hold For Me</h2>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{productName}</p>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {!reservation ? (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Reserve this item at a branch — it will be held for <strong className="text-primary">2 hours</strong>.
                Show the OTP code to pick it up.
              </p>

              {/* Branch selector */}
              <div className="mb-4">
                <label className="block text-xs font-mono text-muted-foreground mb-2">SELECT BRANCH</label>
                <div className="space-y-2">
                  {branches.map(b => (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBranch(b.id)}
                      className={`w-full flex items-start gap-3 p-3 rounded-sm border transition-all text-left ${
                        selectedBranch === b.id
                          ? "border-primary bg-primary/10 shadow-[0_0_12px_rgba(0,240,255,0.1)]"
                          : "border-border hover:border-primary/40 bg-background"
                      }`}
                    >
                      <MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-foreground">{b.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{b.location}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-[#F04444] text-xs font-mono mb-3">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </div>
              )}

              <button
                onClick={handleReserve}
                disabled={!selectedBranch || loading}
                className="w-full py-3 bg-primary text-black font-heading font-bold text-sm uppercase tracking-widest rounded-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
              >
                {loading ? "Reserving..." : "Reserve Now"}
              </button>
            </>
          ) : (
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <h3 className="font-heading text-lg font-bold text-foreground mb-1">Reservation Confirmed!</h3>
              <p className="text-sm text-muted-foreground mb-5">
                Held at <strong className="text-foreground">{reservation.branchName}</strong>
              </p>

              {/* OTP code */}
              <div className="bg-background border border-primary/40 rounded-sm p-4 mb-4">
                <div className="text-xs font-mono text-muted-foreground mb-2">YOUR OTP CODE</div>
                <div className="flex items-center justify-center gap-3">
                  <span className="font-mono text-4xl font-bold tracking-[0.3em] text-primary">
                    {reservation.otpCode}
                  </span>
                  <button onClick={copyOtp} className="text-muted-foreground hover:text-primary transition-colors">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Countdown */}
              <div className="flex items-center justify-center gap-2 text-amber-400 font-mono text-sm mb-5">
                <Clock className="w-4 h-4" />
                <span>Expires in: <strong>{countdown}</strong></span>
              </div>

              <p className="text-xs text-muted-foreground font-mono">
                Show this code at the branch counter to pick up your item.
              </p>

              <button
                onClick={onClose}
                className="mt-5 w-full py-2.5 border border-border text-sm font-mono text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all rounded-sm"
              >
                Close
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
