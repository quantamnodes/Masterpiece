import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface RecentlyViewedItem {
  id: number;
  name: string;
  slug: string;
  category: string;
  basePrice: string;
  salePrice: string | null;
  imageUrl: string;
  badge: string | null;
  stock: number;
  viewedAt: number;
}

interface RecentlyViewedStore {
  items: RecentlyViewedItem[];
  addItem: (item: Omit<RecentlyViewedItem, "viewedAt">) => void;
  clearAll: () => void;
}

const MAX_ITEMS = 8;

export const useRecentlyViewedStore = create<RecentlyViewedStore>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const filtered = state.items.filter((i) => i.id !== item.id);
          const updated = [{ ...item, viewedAt: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
          return { items: updated };
        }),
      clearAll: () => set({ items: [] }),
    }),
    { name: "axiomcraft-recently-viewed" },
  ),
);
