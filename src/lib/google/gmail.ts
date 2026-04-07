import { addCalendarDaysIso, isoToGmailSlashDate } from "@/lib/date-range";
import { GMAIL_REAUTH_REQUIRED, gmailApiRequiresReauth } from "@/lib/google/reauth";

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

/**
 * Helper to extract numeric amounts (e.g., 500.00) from bank strings
 */
function parseAmountWithRegex(snippet: string, re: RegExp): number | undefined {
  const m = snippet.match(re);
  if (!m) return undefined;
  const whole = m[1]?.replace(/,/g, "");
  const frac = m[2] ?? "";
  const n = Number(frac ? `${whole}.${frac}` : whole);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Helper to extract merchant names from strings like "at Zomato" or "to Starbucks"
 */
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
  hint?: RegExp; 
};

/**
 * Bank-specific patterns for HDFC, ICICI, and generic UPI apps
 */
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

// export function parseTransactionSnippet(snippet: string) {
//   const preferred = PATTERNS.filter((p) => (p.hint ? p.hint.test(snippet) : false));
//   const ordered = preferred.length ? [...preferred, ...PATTERNS.filter((p) => !preferred.includes(p))] : PATTERNS;

//   for (const p of ordered) {
//     let amount: number | undefined;
//     for (const re of p.amount) {
//       amount = parseAmountWithRegex(snippet, re);
//       if (amount !== undefined) break;
//     }
//     const merchant = pickMerchant(snippet, p.merchant);
//     if (amount !== undefined || merchant) {
//       return { amount, merchant, parser: p.name };
//     }
//   }

//   let amount: number | undefined;
//   for (const re of GENERIC_AMOUNT) {
//     amount = parseAmountWithRegex(snippet, re);
//     if (amount !== undefined) break;
//   }
//   const merchant = pickMerchant(snippet, GENERIC_MERCHANT);
//   return { amount, merchant, parser: "Generic" };
// }

export function parseTransactionSnippet(snippet: string) {
  const lowerSnippet = snippet.toLowerCase();
  
  // 1. Determine if it's a Credit or Debit
  const isCredit = lowerSnippet.includes("credited") || lowerSnippet.includes("received");
  const type = isCredit ? "credit" : "debit";

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
      return { amount, merchant, parser: p.name, type }; // Added type here
    }
  }

  // Generic fallback
  let amount: number | undefined;
  for (const re of GENERIC_AMOUNT) {
    amount = parseAmountWithRegex(snippet, re);
    if (amount !== undefined) break;
  }
  const merchant = pickMerchant(snippet, GENERIC_MERCHANT);
  return { amount, merchant, parser: "Generic", type }; // Added type here
}

export type GmailFetchDateRange = {
  /** Inclusive start, `YYYY-MM-DD` (internal); Gmail query uses `after:YYYY/MM/DD`. */
  startDate: string;
  /** Inclusive end, `YYYY-MM-DD` (internal); Gmail uses exclusive `before:` on the next calendar day. */
  endDate: string;
};

function buildTransactionSearchQuery(range: GmailFetchDateRange): string {
  const base =
    '(debited OR credited OR "transaction alert" OR "spent") -newsletter -promotion -statement';
  const afterSlash = isoToGmailSlashDate(range.startDate);
  const beforeExclusiveIso = addCalendarDaysIso(range.endDate, 1);
  const beforeSlash = isoToGmailSlashDate(beforeExclusiveIso);
  return `${base} after:${afterSlash} before:${beforeSlash}`;
}

/** Gmail allows up to 500 IDs per list request. */
const GMAIL_LIST_PAGE_MAX = 500;

/** Hard cap on how many messages we list + fetch (Vercel timeout / abuse guard). */
export const GMAIL_FETCH_SAFETY_CAP = 500;

/** Concurrent message-detail fetches per batch (Promise.all size). */
const GMAIL_MESSAGE_FETCH_BATCH = 20;

export type FetchLatestTransactionEmailsResult = {
  items: GmailPreviewItem[];
  /** When nothing to import; not an error. */
  message?: string;
  /** How many message IDs matched the Gmail search (before snippet filtering). */
  listedCount?: number;
  /** True if listing stopped at {@link GMAIL_FETCH_SAFETY_CAP}. */
  capped?: boolean;
};

export type FetchTransactionEmailsOptions = {
  /** Override default safety cap (default {@link GMAIL_FETCH_SAFETY_CAP}). */
  safetyCap?: number;
};

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Paginates through `users.messages.list` until no `nextPageToken` or safety cap.
 */
async function listAllMatchingMessageIds(
  accessToken: string,
  q: string,
  safetyCap: number,
): Promise<{ ids: string[]; capped: boolean }> {
  const ids: string[] = [];
  let pageToken: string | undefined;

  while (ids.length < safetyCap) {
    const remaining = safetyCap - ids.length;
    const maxResults = Math.min(GMAIL_LIST_PAGE_MAX, remaining);

    const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
    listUrl.searchParams.set("q", q);
    listUrl.searchParams.set("maxResults", String(maxResults));
    if (pageToken) listUrl.searchParams.set("pageToken", pageToken);

    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listRes.ok) {
      const text = await listRes.text();
      if (gmailApiRequiresReauth(listRes.status, text)) {
        throw new Error(GMAIL_REAUTH_REQUIRED);
      }
      throw new Error(`Gmail list failed: ${listRes.status} ${text}`);
    }

    const listJson = (await listRes.json()) as {
      messages?: { id: string }[];
      nextPageToken?: string;
    };

    const pageIds = (listJson.messages ?? []).map((m) => m.id);
    let consumedAllPage = true;
    for (const id of pageIds) {
      if (ids.length >= safetyCap) {
        consumedAllPage = false;
        break;
      }
      ids.push(id);
    }

    if (ids.length >= safetyCap) {
      const capped = Boolean(listJson.nextPageToken) || !consumedAllPage;
      return { ids, capped };
    }

    if (!listJson.nextPageToken || pageIds.length === 0) break;
    pageToken = listJson.nextPageToken;
  }

  return { ids, capped: false };
}

async function fetchOneMessagePreview(
  accessToken: string,
  id: string,
): Promise<GmailPreviewItem | null> {
  const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`;
  const msgRes = await fetch(msgUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!msgRes.ok) {
    const text = await msgRes.text();
    if (gmailApiRequiresReauth(msgRes.status, text)) {
      throw new Error(GMAIL_REAUTH_REQUIRED);
    }
    return null;
  }

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

  const lowerSnippet = snippet.toLowerCase();
  if (
    !lowerSnippet.includes("debited") &&
    !lowerSnippet.includes("credited") &&
    !lowerSnippet.includes("spent")
  ) {
    return null;
  }

  return {
    id: msgJson.id,
    date,
    snippet,
    parsed: parseTransactionSnippet(snippet),
  };
}

/**
 * Fetches all transaction-like emails in range (paginated list + batched detail fetches).
 * Date range uses Gmail `after:YYYY/MM/DD` and `before:YYYY/MM/DD` (end inclusive via next-day boundary).
 */
export async function fetchLatestTransactionEmails(
  accessToken: string,
  range: GmailFetchDateRange,
  options?: FetchTransactionEmailsOptions,
): Promise<FetchLatestTransactionEmailsResult> {
  const safetyCap = Math.min(
    options?.safetyCap ?? GMAIL_FETCH_SAFETY_CAP,
    GMAIL_FETCH_SAFETY_CAP,
  );
  const q = buildTransactionSearchQuery(range);

  const { ids, capped } = await listAllMatchingMessageIds(accessToken, q, safetyCap);

  if (ids.length === 0) {
    return {
      items: [],
      message:
        "No emails matched this search in the selected date range. Try a wider range or different keywords in Gmail.",
      listedCount: 0,
      capped: false,
    };
  }

  const items: GmailPreviewItem[] = [];
  for (const batch of chunk(ids, GMAIL_MESSAGE_FETCH_BATCH)) {
    const batchResults = await Promise.all(
      batch.map((id) => fetchOneMessagePreview(accessToken, id)),
    );
    for (const row of batchResults) {
      if (row) items.push(row);
    }
  }

  let message: string | undefined;
  if (items.length === 0) {
    message =
      "Gmail returned messages in this range, but none looked like transaction alerts (debited / credited / spent).";
  } else if (capped) {
    message = `Showing up to ${ids.length} messages (safety cap ${GMAIL_FETCH_SAFETY_CAP}). Narrow the date range if you need a smaller set.`;
  }

  return {
    items,
    message,
    listedCount: ids.length,
    capped,
  };
}

export async function fetchMessagesByIds(accessToken: string, ids: string[]) {
  const items: GmailPreviewItem[] = [];
  for (const batch of chunk(ids, GMAIL_MESSAGE_FETCH_BATCH)) {
    const batchResults = await Promise.all(
      batch.map(async (id) => {
        const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`;
        const msgRes = await fetch(msgUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!msgRes.ok) {
          const text = await msgRes.text();
          if (gmailApiRequiresReauth(msgRes.status, text)) {
            throw new Error(GMAIL_REAUTH_REQUIRED);
          }
          return null;
        }
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
        return {
          id: msgJson.id,
          date,
          snippet,
          parsed: parseTransactionSnippet(snippet),
        } satisfies GmailPreviewItem;
      }),
    );
    for (const row of batchResults) {
      if (row) items.push(row);
    }
  }
  return items;
}