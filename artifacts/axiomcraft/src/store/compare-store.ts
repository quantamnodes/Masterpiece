import { create } from "zustand";

export interface CompareProduct {
  id: number;
  name: string;
  slug: string;
  category: string;
  basePrice: string;
  salePrice: string | null;
  imageUrl: string;
  stock: number;
  specs: Array<{ name: string; value: string }>;
}

interface CompareStore {
  items: CompareProduct[];
  addItem: (p: CompareProduct) => void;
  removeItem: (id: number) => void;
  clearAll: () => void;
  isInList: (id: number) => boolean;
}

const MAX_COMPARE = 4;

export const useCompareStore = create<CompareStore>()((set, get) => ({
  items: [],
  addItem: (p) =>
    set((s) => {
      if (s.items.find((i) => i.id === p.id)) return s;
      if (s.items.length >= MAX_COMPARE) return s;
      return { items: [...s.items, p] };
    }),
  removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  clearAll: () => set({ items: [] }),
  isInList: (id) => get().items.some((i) => i.id === id),
}));
