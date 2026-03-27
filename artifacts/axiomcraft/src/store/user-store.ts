import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Tier = "bronze" | "silver" | "gold" | "platinum";
export type UserRole = "user" | "owner" | "manager" | "admin";

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  branchId: number | null;
  tier: Tier;
  totalSpent: number;
  purchaseCount: number;
  loyaltyPoints: number;
}

export function isOwner(user: UserProfile | null): boolean {
  return user?.role === "owner" || user?.role === "admin";
}

export function isManager(user: UserProfile | null): boolean {
  return user?.role === "manager";
}

export function isStaff(user: UserProfile | null): boolean {
  return isOwner(user) || isManager(user);
}

interface UserStore {
  user: UserProfile | null;
  isLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  setLoading: (v: boolean) => void;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

const API = import.meta.env.VITE_API_URL || `${import.meta.env.BASE_URL}api`;

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      setUser: (user) => set({ user }),
      setLoading: (v) => set({ isLoading: v }),
      logout: async () => {
        try {
          await fetch(`${API}/auth/logout`, { method: "POST", credentials: "include" });
        } catch {}
        set({ user: null });
      },
      fetchMe: async () => {
        try {
          const res = await fetch(`${API}/auth/me`, { credentials: "include" });
          if (res.ok) {
            const user = await res.json();
            set({ user });
          } else {
            set({ user: null });
          }
        } catch {
          set({ user: null });
        }
      },
    }),
    {
      name: "axiomcraft-user",
      partialize: (s) => ({ user: s.user }),
    },
  ),
);

export const TIER_CONFIG: Record<Tier, { label: string; color: string; discount: number; next: number | null; bg: string }> = {
  bronze: { label: "Bronze", color: "text-amber-600", bg: "border-amber-600/40 bg-amber-600/10", discount: 0, next: 500 },
  silver: { label: "Silver", color: "text-slate-300", bg: "border-slate-300/40 bg-slate-300/10", discount: 3, next: 2000 },
  gold: { label: "Gold", color: "text-yellow-400", bg: "border-yellow-400/40 bg-yellow-400/10", discount: 7, next: 10000 },
  platinum: { label: "Platinum", color: "text-primary", bg: "border-primary/40 bg-primary/10", discount: 15, next: null },
};
