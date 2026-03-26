/**
 * Formats INR. Handles negatives without crashing; shows a leading minus (e.g. -₹400.00).
 */
export function formatINR(amount: number) {
  if (!Number.isFinite(amount)) {
    return "—";
  }
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

  if (amount < 0) {
    return `-${formatted}`;
  }
  return formatted;
}

/** Hybrid categories: auto-tag from merchant name; user can override in DB. */
export type Category = "Food" | "Transport" | "Shopping" | "Other";

export const CATEGORY_OPTIONS: readonly Category[] = [
  "Food",
  "Transport",
  "Shopping",
  "Other",
] as const;

/**
 * Auto-categorize from merchant string (used on Gmail save + fallback for legacy rows).
 */
export function categorizeMerchant(name: string): Category {
  const m = name.toLowerCase();

  if (/(swiggy|zomato|zepto|blinkit)/.test(m)) return "Food";
  if (/(uber|rapido|ola|blusmart)/.test(m)) return "Transport";
  if (/(amazon|myntra|nykaa|flipkart)/.test(m)) return "Shopping";
  return "Other";
}

/**
 * Resolve chart/UI category: prefer stored `category`, map legacy values, else infer from merchant.
 */
export function resolveCategory(
  stored: string | null | undefined,
  merchant: string,
): Category {
  const s = stored?.trim();
  if (
    s === "Food" ||
    s === "Transport" ||
    s === "Shopping" ||
    s === "Other"
  ) {
    return s;
  }
  if (s === "Travel" || s === "Transfers") return "Transport";
  if (!s) return categorizeMerchant(merchant);
  return categorizeMerchant(merchant);
}
