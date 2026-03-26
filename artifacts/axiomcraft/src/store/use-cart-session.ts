import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

interface CartSessionStore {
  sessionId: string;
  initSession: () => void;
}

export const useCartSession = create<CartSessionStore>()(
  persist(
    (set, get) => ({
      sessionId: '',
      initSession: () => {
        if (!get().sessionId) {
          set({ sessionId: uuidv4() });
        }
      }
    }),
    {
      name: 'axiomcraft-cart-session',
    }
  )
);
