/**
 * Localization — currency rates + IP-based country detection
 *
 * GET /localization/rates   — static exchange rate table (base: USD)
 * GET /localization/detect  — detect country/currency from IP
 */
import { Router } from "express";

const router = Router();

/* Static exchange rates (base: USD, updated periodically) */
const RATES: Record<string, { symbol: string; name: string; rate: number; flag: string }> = {
  USD: { symbol: "$",  name: "US Dollar",         rate: 1,       flag: "🇺🇸" },
  EUR: { symbol: "€",  name: "Euro",               rate: 0.92,    flag: "🇪🇺" },
  GBP: { symbol: "£",  name: "British Pound",      rate: 0.79,    flag: "🇬🇧" },
  JPY: { symbol: "¥",  name: "Japanese Yen",       rate: 149.5,   flag: "🇯🇵" },
  CAD: { symbol: "CA$", name: "Canadian Dollar",   rate: 1.36,    flag: "🇨🇦" },
  AUD: { symbol: "A$", name: "Australian Dollar",  rate: 1.53,    flag: "🇦🇺" },
  INR: { symbol: "₹",  name: "Indian Rupee",       rate: 83.5,    flag: "🇮🇳" },
  BDT: { symbol: "৳",  name: "Bangladeshi Taka",   rate: 110,     flag: "🇧🇩" },
  SGD: { symbol: "S$", name: "Singapore Dollar",   rate: 1.34,    flag: "🇸🇬" },
  AED: { symbol: "د.إ", name: "UAE Dirham",        rate: 3.67,    flag: "🇦🇪" },
  MYR: { symbol: "RM", name: "Malaysian Ringgit",  rate: 4.71,    flag: "🇲🇾" },
  KRW: { symbol: "₩",  name: "South Korean Won",   rate: 1335,    flag: "🇰🇷" },
  CNY: { symbol: "¥",  name: "Chinese Yuan",       rate: 7.24,    flag: "🇨🇳" },
  BRL: { symbol: "R$", name: "Brazilian Real",     rate: 4.97,    flag: "🇧🇷" },
  MXN: { symbol: "MX$", name: "Mexican Peso",      rate: 17.15,   flag: "🇲🇽" },
};

/* Simple IP → country mapping using free api */
const IP_TO_CURRENCY: Record<string, string> = {
  // Handled by the detect endpoint dynamically
};

/* GET /localization/rates */
router.get("/localization/rates", (_req, res) => {
  res.json({ rates: RATES, baseCurrency: "USD" });
});

/* GET /localization/detect — detect currency from IP */
router.get("/localization/detect", async (req, res) => {
  try {
    /* Try to get real IP */
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "127.0.0.1";

    /* Skip detection for loopback */
    if (ip === "127.0.0.1" || ip === "::1" || ip?.startsWith("10.") || ip?.startsWith("192.168")) {
      return res.json({ currency: "USD", country: "US", detected: false });
    }

    /* Use free ip-api.com (no auth required, 1000 req/min) */
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    try {
      const r = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode,currency`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (r.ok) {
        const data = (await r.json()) as { countryCode?: string; currency?: string };
        const currency = data.currency && RATES[data.currency] ? data.currency : "USD";
        return res.json({ currency, country: data.countryCode ?? "US", detected: true });
      }
    } catch {
      clearTimeout(timeout);
    }

    return res.json({ currency: "USD", country: "US", detected: false });
  } catch {
    return res.json({ currency: "USD", country: "US", detected: false });
  }
});

export default router;
