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

export type Category =
  | "Food"
  | "Shopping"
  | "Travel"
  | "Bills"
  | "Subscriptions"
  | "Transfers"
  | "Other";

export function categorizeMerchant(merchant: string): Category {
  const m = merchant.toLowerCase();

  if (/(swiggy|zomato|domino|pizza|kfc|mcd|restaurant|cafe)/.test(m)) return "Food";
  if (/(amazon|flipkart|myntra|ajio|shopping)/.test(m)) return "Shopping";
  if (/(uber|ola|irctc|makemytrip|goibibo|flight|hotel)/.test(m)) return "Travel";
  if (/(electricity|water|gas|broadband|recharge|bill)/.test(m)) return "Bills";
  if (/(netflix|spotify|prime|subscription|hotstar|zee5)/.test(m)) return "Subscriptions";
  if (/(upi|transfer|imps|neft|rtgs)/.test(m)) return "Transfers";
  return "Other";
}
