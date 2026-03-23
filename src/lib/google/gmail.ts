export type GmailPreviewItem = {
  id: string;
  date: string; // YYYY-MM-DD (from Gmail internalDate)
  snippet: string;
  parsed: {
    amount?: number;
    merchant?: string;
    parser?: string;
  };
};

function parseAmountWithRegex(snippet: string, re: RegExp): number | undefined {
  const m = snippet.match(re);
  if (!m) return undefined;
  const whole = m[1]?.replace(/,/g, "");
  const frac = m[2] ?? "";
  const n = Number(frac ? `${whole}.${frac}` : whole);
  return Number.isFinite(n) ? n : undefined;
}

function pickMerchant(snippet: string, patterns: RegExp[]): string | undefined {
  const cleaned = snippet.replace(/\s+/g, " ").trim();
  for (const re of patterns) {
    const m = cleaned.match(re);
    const raw = m?.[1]?.trim();
    if (!raw) continue;
    const merchant = raw.replace(/[,.;].*$/, "").trim();
    if (merchant.length >= 2) return merchant;
  }
  return undefined;
}

type ParserPattern = {
  name: string;
  amount: RegExp[];
  merchant: RegExp[];
  hint?: RegExp; // quick check to prefer the pattern
};

const PATTERNS: ParserPattern[] = [
  {
    name: "HDFC",
    hint: /\bhdfc\b|hdfcbank/i,
    amount: [
      /\bINR\s*([0-9][0-9,]*)(?:\.(\d{1,2}))?\b/i,
      /\bRs\.?\s*([0-9][0-9,]*)(?:\.(\d{1,2}))?\b/i,
      /₹\s*([0-9][0-9,]*)(?:\.(\d{1,2}))?/i,
    ],
    merchant: [
      /\bat\s+([A-Z0-9][A-Z0-9 &._/-]{2,60})\b/i,
      /\bto\s+([A-Z0-9][A-Z0-9 &._/-]{2,60})\b/i,
      /\bmerchant[:\s]+([A-Z0-9][A-Z0-9 &._/-]{2,60})\b/i,
      /\b(?:Info|Ref)[:\s]+([A-Z0-9][A-Z0-9 &._/-]{2,60})\b/i,
    ],
  },
  {
    name: "ICICI",
    hint: /\bicici\b/i,
    amount: [
      /\bINR\s*([0-9][0-9,]*)(?:\.(\d{1,2}))?\b/i,
      /\bRs\.?\s*([0-9][0-9,]*)(?:\.(\d{1,2}))?\b/i,
      /₹\s*([0-9][0-9,]*)(?:\.(\d{1,2}))?/i,
    ],
    merchant: [
      /\bat\s+([A-Z0-9][A-Z0-9 &._/-]{2,60})\b/i,
      /\bto\s+([A-Z0-9][A-Z0-9 &._/-]{2,60})\b/i,
      /\bVPA\s+([A-Z0-9][A-Z0-9 &._/-]{2,60})\b/i,
    ],
  },
  {
    name: "UPI",
    hint: /\bupi\b/i,
    amount: [
      /\bINR\s*([0-9][0-9,]*)(?:\.(\d{1,2}))?\b/i,
      /\bRs\.?\s*([0-9][0-9,]*)(?:\.(\d{1,2}))?\b/i,
      /₹\s*([0-9][0-9,]*)(?:\.(\d{1,2}))?/i,
    ],
    merchant: [
      /\bUPI\b.*?\bto\s+([A-Z0-9][A-Z0-9 &._/-]{2,60})\b/i,
      /\bUPI\b.*?\bat\s+([A-Z0-9][A-Z0-9 &._/-]{2,60})\b/i,
      /\bVPA[:\s]+([A-Z0-9][A-Z0-9 &._@/-]{2,80})\b/i,
    ],
  },
];

const GENERIC_AMOUNT: RegExp[] = [
  /\bINR\s*([0-9][0-9,]*)(?:\.(\d{1,2}))?\b/i,
  /\bRs\.?\s*([0-9][0-9,]*)(?:\.(\d{1,2}))?\b/i,
  /₹\s*([0-9][0-9,]*)(?:\.(\d{1,2}))?/i,
];

const GENERIC_MERCHANT: RegExp[] = [/\bat\s+([A-Z0-9][A-Z0-9 &._/-]{2,60})\b/i];

export function parseTransactionSnippet(snippet: string) {
  // Prefer patterns whose hint matches; otherwise still try all.
  const preferred = PATTERNS.filter((p) => (p.hint ? p.hint.test(snippet) : false));
  const ordered = preferred.length ? [...preferred, ...PATTERNS.filter((p) => !preferred.includes(p))] : PATTERNS;

  for (const p of ordered) {
    let amount: number | undefined;
    for (const re of p.amount) {
      amount = parseAmountWithRegex(snippet, re);
      if (amount !== undefined) break;
    }
    const merchant = pickMerchant(snippet, p.merchant);
    if (amount !== undefined || merchant) {
      return { amount, merchant, parser: p.name };
    }
  }

  // Generic fallback: any currency + "at <merchant>"
  let amount: number | undefined;
  for (const re of GENERIC_AMOUNT) {
    amount = parseAmountWithRegex(snippet, re);
    if (amount !== undefined) break;
  }
  const merchant = pickMerchant(snippet, GENERIC_MERCHANT);
  return { amount, merchant, parser: "Generic" };
}

export async function fetchLatestTransactionEmails(accessToken: string, maxResults = 10) {
  // Gmail search query: keyword-based (flexible across banks).
  // Using OR keeps it broad while still relevant.
  const q = "(debited OR spent OR transaction)";

  const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  listUrl.searchParams.set("q", q);
  listUrl.searchParams.set("maxResults", String(maxResults));

  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!listRes.ok) {
    const text = await listRes.text();
    throw new Error(`Gmail list failed: ${listRes.status} ${text}`);
  }

  const listJson = (await listRes.json()) as { messages?: { id: string }[] };
  const ids = (listJson.messages ?? []).map((m) => m.id);

  const items: GmailPreviewItem[] = [];
  for (const id of ids) {
    const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`;
    const msgRes = await fetch(msgUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!msgRes.ok) continue;
    const msgJson = (await msgRes.json()) as {
      id: string;
      snippet?: string;
      internalDate?: string;
    };
    const snippet = msgJson.snippet ?? "";
    const internalDateMs = msgJson.internalDate ? Number(msgJson.internalDate) : NaN;
    const date = Number.isFinite(internalDateMs)
      ? new Date(internalDateMs).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    items.push({
      id: msgJson.id,
      date,
      snippet,
      parsed: parseTransactionSnippet(snippet),
    });
  }

  return items;
}

export async function fetchMessagesByIds(accessToken: string, ids: string[]) {
  const items: GmailPreviewItem[] = [];
  for (const id of ids) {
    const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`;
    const msgRes = await fetch(msgUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!msgRes.ok) continue;
    const msgJson = (await msgRes.json()) as {
      id: string;
      snippet?: string;
      internalDate?: string;
    };
    const snippet = msgJson.snippet ?? "";
    const internalDateMs = msgJson.internalDate ? Number(msgJson.internalDate) : NaN;
    const date = Number.isFinite(internalDateMs)
      ? new Date(internalDateMs).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    items.push({
      id: msgJson.id,
      date,
      snippet,
      parsed: parseTransactionSnippet(snippet),
    });
  }
  return items;
}

