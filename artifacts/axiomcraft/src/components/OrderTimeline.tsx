/**
 * OrderTimeline — full tracking timeline with rider GPS indicator.
 * Used in Account.tsx order history view when an order is expanded.
 *
 * Polls rider location every 15s while order is out_for_delivery / arriving.
 */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, Package, Truck, Navigation, MapPin,
  CheckCircle2, XCircle, Clock, Phone, User, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API = `${import.meta.env.BASE_URL}api`;

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "check-circle":   CheckCircle,
  "package":        Package,
  "truck":          Truck,
  "navigation":     Navigation,
  "map-pin":        MapPin,
  "check-circle-2": CheckCircle2,
  "x-circle":       XCircle,
};

interface TimelineStep {
  status: string;
  label: string;
  description: string;
  icon: string;
  completed: boolean;
  active: boolean;
  completedAt: string | null;
  note: string;
}

interface TrackingData {
  order: {
    id: number;
    status: string;
    fulfillmentType: string;
    estimatedDelivery: string | null;
    riderName: string | null;
    riderPhone: string | null;
    deliveryAddress: string | null;
    createdAt: string;
    totalAmount: string;
  };
  timeline: TimelineStep[];
  eta: string | null;
  riderLocation: { lat: number; lng: number; heading: number; updatedAt: string } | null;
}

interface Props {
  orderId: number;
  onClose?: () => void;
}

export function OrderTimeline({ orderId, onClose }: Props) {
  const [data, setData]     = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");
  const pollRef             = useRef<NodeJS.Timeout | null>(null);

  const fetchTracking = async () => {
    try {
      const res = await fetch(`${API}/orders/${orderId}/tracking`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      const d = await res.json() as TrackingData;
      setData(d);
      setError("");
    } catch {
      setError("Could not load tracking data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [orderId]);

  /* Poll every 15s when rider is active */
  useEffect(() => {
    if (!data) return;
    const needsPoll = ["out_for_delivery", "arriving"].includes(data.order.status);
    if (needsPoll && !pollRef.current) {
      pollRef.current = setInterval(fetchTracking, 15000);
    } else if (!needsPoll && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, [data?.order.status]);

  if (loading) {
    return (
      <div className="p-6 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-3 bg-muted animate-pulse rounded w-1/3" />
              <div className="h-2.5 bg-muted animate-pulse rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return <div className="p-6 text-sm text-[#F04444] font-mono">{error || "No data"}</div>;
  }

  const { order, timeline, eta, riderLocation } = data;
  const showRider = ["out_for_delivery", "arriving"].includes(order.status);

  return (
    <div className="p-5 space-y-5">
      {/* ETA */}
      {eta && order.status !== "delivered" && order.status !== "cancelled" && (
        <div className="flex items-center gap-2.5 p-3 bg-primary/5 border border-primary/20 rounded-sm">
          <Clock className="w-4 h-4 text-primary shrink-0" />
          <div>
            <div className="text-xs font-mono text-muted-foreground">ESTIMATED ARRIVAL</div>
            <div className="text-sm font-semibold text-primary">
              {new Date(eta).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </div>
          </div>
        </div>
      )}

      {/* Rider info */}
      {showRider && (order.riderName || order.riderPhone) && (
        <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-sm">
          <User className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex-1">
            <div className="text-xs font-mono text-muted-foreground">YOUR RIDER</div>
            <div className="text-sm font-semibold text-foreground">{order.riderName ?? "Assigned"}</div>
          </div>
          {order.riderPhone && (
            <a href={`tel:${order.riderPhone}`} className="flex items-center gap-1.5 text-xs font-mono text-primary hover:underline">
              <Phone className="w-3 h-3" />
              {order.riderPhone}
            </a>
          )}
        </div>
      )}

      {/* GPS indicator */}
      {showRider && riderLocation && (
        <div className="flex items-center gap-2.5 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-sm">
          <div className="relative">
            <Navigation className="w-4 h-4 text-emerald-400" style={{ transform: `rotate(${riderLocation.heading}deg)` }} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <div>
            <div className="text-xs font-mono text-emerald-400">RIDER LIVE LOCATION</div>
            <div className="text-[10px] font-mono text-muted-foreground">
              Updated {new Date(riderLocation.updatedAt).toLocaleTimeString()}
            </div>
          </div>
          <button onClick={fetchTracking} className="ml-auto text-muted-foreground hover:text-primary transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-0">
        {timeline.filter(s => s.status !== "cancelled" || order.status === "cancelled").map((step, idx) => {
          const Icon = ICON_MAP[step.icon] ?? CheckCircle;
          const isLast = idx === timeline.length - 1;
          return (
            <div key={step.status} className="flex gap-3">
              {/* Spine + icon */}
              <div className="flex flex-col items-center">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-500",
                  step.completed && !step.active && "border-primary bg-primary/20",
                  step.active    && "border-primary bg-primary shadow-[0_0_12px_rgba(0,240,255,0.4)] animate-pulse",
                  !step.completed && !step.active && "border-border bg-background",
                  order.status === "cancelled" && step.status === "cancelled" && "border-[#F04444] bg-[#F04444]/20",
                )}>
                  <Icon className={cn(
                    "w-3.5 h-3.5",
                    step.active && "text-primary",
                    step.completed && !step.active && "text-primary",
                    !step.completed && !step.active && "text-muted-foreground",
                    order.status === "cancelled" && step.status === "cancelled" && "text-[#F04444]",
                  )} />
                </div>
                {!isLast && (
                  <div className={cn(
                    "w-0.5 flex-1 min-h-[28px] mt-1 transition-colors",
                    step.completed ? "bg-primary/40" : "bg-border"
                  )} />
                )}
              </div>

              {/* Content */}
              <div className={cn("pb-5 flex-1", isLast && "pb-0")}>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className={cn(
                    "text-sm font-semibold leading-tight",
                    step.active ? "text-foreground" : step.completed ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {step.label}
                  </span>
                  {step.active && (
                    <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">CURRENT</span>
                  )}
                </div>
                <p className={cn("text-xs leading-relaxed mt-0.5", step.active || step.completed ? "text-muted-foreground" : "text-muted-foreground/50")}>
                  {step.description}
                </p>
                {step.note && (
                  <p className="text-xs text-muted-foreground/60 font-mono mt-0.5 italic">{step.note}</p>
                )}
                {step.completedAt && (
                  <p className="text-[10px] font-mono text-muted-foreground/50 mt-1">
                    {new Date(step.completedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Delivery address */}
      {order.deliveryAddress && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground font-mono pt-2 border-t border-border">
          <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
          <span>{order.deliveryAddress}</span>
        </div>
      )}
    </div>
  );
}
