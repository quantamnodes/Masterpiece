/**
 * StockBadge — traffic-light stock-level indicator
 *
 * Levels:
 *   ● GREEN  (>10 units)       → In Stock
 *   ● AMBER  (1–10 units)      → Low Stock — X left!
 *   ● RED    (0 units)         → Out of Stock
 */
import { cn } from "@/lib/utils";

interface Props {
  stock: number;
  className?: string;
  size?: "sm" | "md";
}

export function StockBadge({ stock, className, size = "sm" }: Props) {
  const isOut  = stock <= 0;
  const isLow  = stock > 0 && stock <= 10;
  const isGood = stock > 10;

  const dot  = cn("inline-block rounded-full shrink-0 animate-pulse", size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5");
  const text = cn("font-mono leading-none", size === "sm" ? "text-[10px]" : "text-xs");

  if (isOut) {
    return (
      <span className={cn("inline-flex items-center gap-1.5", className)}>
        <span className={cn(dot, "bg-[#F04444] animate-none")} />
        <span className={cn(text, "text-[#F04444]")}>Out of Stock</span>
      </span>
    );
  }
  if (isLow) {
    return (
      <span className={cn("inline-flex items-center gap-1.5", className)}>
        <span className={cn(dot, "bg-amber-400")} />
        <span className={cn(text, "text-amber-400")}>Low Stock — {stock} left!</span>
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={cn(dot, "bg-emerald-400")} />
      <span className={cn(text, "text-emerald-400")}>In Stock</span>
    </span>
  );
}
