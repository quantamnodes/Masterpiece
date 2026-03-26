import { Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useWishlistStore } from "@/store/wishlist-store";
import { useUserStore } from "@/store/user-store";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface WishlistButtonProps {
  productId: number;
  className?: string;
  size?: "sm" | "md";
}

export function WishlistButton({ productId, className = "", size = "sm" }: WishlistButtonProps) {
  const { isWishlisted, toggle } = useWishlistStore();
  const { user } = useUserStore();
  const navigate = useNavigate();
  const { toast } = useToast();
  const wishlisted = isWishlisted(productId);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast({ title: "Sign in required", description: "Create an account to save items to your wishlist." });
      navigate("/account");
      return;
    }
    await toggle(productId);
    toast({
      title: wishlisted ? "Removed from wishlist" : "Saved to wishlist",
      description: wishlisted ? "Item removed from your saved list." : "Item added to your saved list.",
    });
  };

  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const btnSize = size === "sm" ? "w-8 h-8" : "w-10 h-10";

  return (
    <motion.button
      onClick={handleClick}
      whileTap={{ scale: 0.85 }}
      className={`${btnSize} flex items-center justify-center rounded-sm border transition-all ${
        wishlisted
          ? "border-red-500/60 bg-red-500/10 text-red-400"
          : "border-border bg-background/80 text-muted-foreground hover:border-red-500/40 hover:text-red-400"
      } ${className}`}
      aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={wishlisted ? "filled" : "empty"}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <Heart className={`${iconSize} ${wishlisted ? "fill-red-400" : ""}`} />
        </motion.div>
      </AnimatePresence>
    </motion.button>
  );
}
