import { create } from "zustand";
import { persist } from "zustand/middleware";

const API = import.meta.env.VITE_API_URL || `${import.meta.env.BASE_URL}api`;

interface WishlistStore {
  ids: number[];
  loading: boolean;
  fetchWishlist: () => Promise<void>;
  addToWishlist: (productId: number) => Promise<void>;
  removeFromWishlist: (productId: number) => Promise<void>;
  toggle: (productId: number) => Promise<void>;
  isWishlisted: (productId: number) => boolean;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      ids: [],
      loading: false,

      isWishlisted: (productId) => get().ids.includes(productId),

      fetchWishlist: async () => {
        set({ loading: true });
        try {
          const res = await fetch(`${API}/wishlist`, { credentials: "include" });
          if (res.ok) {
            const data = await res.json();
            set({ ids: (data.items || []).map((i: { productId: number }) => i.productId) });
          }
        } catch {}
        set({ loading: false });
      },

      addToWishlist: async (productId) => {
        set((s) => ({ ids: [...new Set([...s.ids, productId])] }));
        try {
          await fetch(`${API}/wishlist/${productId}`, {
            method: "POST",
            credentials: "include",
          });
        } catch {}
      },

      removeFromWishlist: async (productId) => {
        set((s) => ({ ids: s.ids.filter((id) => id !== productId) }));
        try {
          await fetch(`${API}/wishlist/${productId}`, {
            method: "DELETE",
            credentials: "include",
          });
        } catch {}
      },

      toggle: async (productId) => {
        if (get().isWishlisted(productId)) {
          await get().removeFromWishlist(productId);
        } else {
          await get().addToWishlist(productId);
        }
      },
    }),
    {
      name: "axiomcraft-wishlist",
      partialize: (s) => ({ ids: s.ids }),
    },
  ),
);
