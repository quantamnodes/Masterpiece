/**
 * Localization store — currency switching + IP detection
 * Reads rates from /api/localization/rates, detects country on boot.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

const API = import.meta.env.VITE_API_URL || `${import.meta.env.BASE_URL}api`;

export interface CurrencyInfo {
  symbol: string;
  name: string;
  rate: number;
  flag: string;
}

interface LocalizationState {
  currency: string;
  country: string;
  rates: Record<string, CurrencyInfo>;
  isLoaded: boolean;
  setCurrency: (code: string) => void;
  loadRates: () => Promise<void>;
  detectFromIp: () => Promise<void>;
  formatPrice: (usdAmount: number) => string;
}

export const useLocalizationStore = create<LocalizationState>()(
  persist(
    (set, get) => ({
      currency: "USD",
      country: "US",
      rates: {},
      isLoaded: false,

      setCurrency: (code: string) => set({ currency: code }),

      loadRates: async () => {
        if (get().isLoaded && Object.keys(get().rates).length > 0) return;
        try {
          const res = await fetch(`${API}/localization/rates`);
          if (res.ok) {
            const data = await res.json() as { rates: Record<string, CurrencyInfo> };
            set({ rates: data.rates, isLoaded: true });
          }
        } catch {}
      },

      detectFromIp: async () => {
        /* Only auto-detect once per session (not persisted via zustand) */
        try {
          const res = await fetch(`${API}/localization/detect`);
          if (res.ok) {
            const data = await res.json() as { currency: string; country: string; detected: boolean };
            if (data.detected) {
              set({ currency: data.currency, country: data.country });
            }
          }
        } catch {}
      },

      formatPrice: (usdAmount: number) => {
        const { currency, rates } = get();
        const info = rates[currency];
        if (!info) return `$${usdAmount.toFixed(2)}`;
        const converted = usdAmount * info.rate;
        /* Use Intl.NumberFormat for locale-aware formatting */
        try {
          return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency,
            minimumFractionDigits: currency === "JPY" || currency === "KRW" ? 0 : 2,
            maximumFractionDigits: currency === "JPY" || currency === "KRW" ? 0 : 2,
          }).format(converted);
        } catch {
          return `${info.symbol}${converted.toFixed(2)}`;
        }
      },
    }),
    {
      name: "axiomcraft-localization",
      partialize: (state) => ({ currency: state.currency, country: state.country }),
    }
  )
);
