/**
 * ReviewVoteButtons — thumbs up/down helpfulness voting for a review.
 * Handles toggle-off (click same vote again to remove it).
 */
import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/store/user-store";

const API = `${import.meta.env.BASE_URL}api`;

interface Props {
  reviewId: number;
  initialHelpful: number;
  initialUnhelpful: number;
}

export function ReviewVoteButtons({ reviewId, initialHelpful, initialUnhelpful }: Props) {
  const { user } = useUserStore();
  const [helpful, setHelpful]     = useState(initialHelpful);
  const [unhelpful, setUnhelpful] = useState(initialUnhelpful);
  const [myVote, setMyVote]       = useState<boolean | null>(null);
  const [loading, setLoading]     = useState(false);

  /* Load existing vote */
  useEffect(() => {
    if (!user) return;
    fetch(`${API}/reviews/${reviewId}/my-vote`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.vote) setMyVote(d.vote.helpful); })
      .catch(() => {});
  }, [reviewId, user]);

  const vote = async (isHelpful: boolean) => {
    if (!user) return;
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/reviews/${reviewId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ helpful: isHelpful }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setHelpful(data.review.helpfulCount);
      setUnhelpful(data.review.unhelpfulCount);
      setMyVote(data.vote ? data.vote.helpful : null);
    } catch {}
    finally { setLoading(false); }
  };

  return (
    <div className="flex items-center gap-3 mt-3">
      <span className="text-xs text-muted-foreground font-mono">Helpful?</span>
      <button
        onClick={() => vote(true)}
        disabled={loading || !user}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border text-xs font-mono transition-all",
          myVote === true
            ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
            : "border-border text-muted-foreground hover:border-emerald-500/50 hover:text-emerald-400",
          !user && "opacity-40 cursor-not-allowed"
        )}
      >
        <ThumbsUp className="w-3 h-3" />
        <span>{helpful}</span>
      </button>
      <button
        onClick={() => vote(false)}
        disabled={loading || !user}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border text-xs font-mono transition-all",
          myVote === false
            ? "border-[#F04444] bg-[#F04444]/10 text-[#F04444]"
            : "border-border text-muted-foreground hover:border-[#F04444]/50 hover:text-[#F04444]",
          !user && "opacity-40 cursor-not-allowed"
        )}
      >
        <ThumbsDown className="w-3 h-3" />
        <span>{unhelpful}</span>
      </button>
      {!user && (
        <span className="text-[10px] text-muted-foreground font-mono">Sign in to vote</span>
      )}
    </div>
  );
}
