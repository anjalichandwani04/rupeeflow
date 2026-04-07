"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  Download,
  Info,
  Loader2,
  Save,
  TriangleAlert,
} from "lucide-react";
import {
  GMAIL_DEFAULT_RANGE_DAYS,
  isoToSlashYmd,
  presetLastDays,
  presetLastMonth,
  resolveGmailRangeFromParams,
} from "@/lib/date-range";
import { GMAIL_REAUTH_REQUIRED } from "@/lib/google/reauth";

type PreviewItem = {
  id: string;
  date: string;
  snippet: string;
  parsed: { amount?: number; merchant?: string; type?: "debit" | "credit" };
};

type ExistingTransactionKey = {
  date: string;
  merchant: string;
  amount: number;
};

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function keyForTransaction(x: ExistingTransactionKey) {
  return `${x.date}|${x.merchant.trim().toLowerCase()}|${Number(x.amount).toFixed(2)}`;
}

export function GmailPreview({
  existingTransactions,
}: {
  existingTransactions: ExistingTransactionKey[];
}) {
  const router = useRouter();
  const [startDate, setStartDate] = useState(() =>
    isoToSlashYmd(presetLastDays(GMAIL_DEFAULT_RANGE_DAYS).startIso),
  );
  const [endDate, setEndDate] = useState(() =>
    isoToSlashYmd(presetLastDays(GMAIL_DEFAULT_RANGE_DAYS).endIso),
  );
  const [items, setItems] = useState<PreviewItem[]>([]);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [isFetching, startFetching] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const syncedSet = new Set(existingTransactions.map(keyForTransaction));

  const unsyncedItems = items.filter((item) => {
    if (
      typeof item.parsed.amount !== "number" ||
      !Number.isFinite(item.parsed.amount) ||
      typeof item.parsed.merchant !== "string" ||
      item.parsed.merchant.trim().length === 0
    ) {
      return false;
    }
    return !syncedSet.has(
      keyForTransaction({
        date: item.date,
        merchant: item.parsed.merchant,
        amount: item.parsed.amount,
      }),
    );
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
      <div className="flex flex-col gap-3 border-b border-black/10 bg-black/5 px-4 py-3 dark:border-white/10 dark:bg-white/10 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium">Gmail preview (transaction emails)</p>
          <p className="text-sm text-black/60 dark:text-white/60">
            Use <span className="font-medium">YYYY/MM/DD</span>. Leave both blank to search the{" "}
            <span className="font-medium">last {GMAIL_DEFAULT_RANGE_DAYS} days</span>. Fetches up to 10 emails matching{" "}
            <span className="font-medium">debited</span>, <span className="font-medium">spent</span>, or{" "}
            <span className="font-medium">transaction</span>, then parse and save.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[min(100%,20rem)] sm:items-end">
          <div className="flex flex-wrap items-end gap-2">
            <button
              type="button"
              onClick={() => {
                const p = presetLastDays(GMAIL_DEFAULT_RANGE_DAYS);
                setStartDate(isoToSlashYmd(p.startIso));
                setEndDate(isoToSlashYmd(p.endIso));
              }}
              className="h-8 rounded-md border border-black/10 px-2.5 text-xs font-medium text-black/70 hover:bg-black/5 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10"
            >
              Last {GMAIL_DEFAULT_RANGE_DAYS} days
            </button>
            <button
              type="button"
              onClick={() => {
                const p = presetLastMonth();
                setStartDate(isoToSlashYmd(p.startIso));
                setEndDate(isoToSlashYmd(p.endIso));
              }}
              className="h-8 rounded-md border border-black/10 px-2.5 text-xs font-medium text-black/70 hover:bg-black/5 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10"
            >
              Last month
            </button>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-[10rem] flex-col gap-1">
              <span className="text-[10px] font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
                Start date
              </span>
              <span className="relative flex items-center">
                <Calendar className="pointer-events-none absolute left-2.5 h-4 w-4 text-black/40 dark:text-white/40" />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="YYYY/MM/DD"
                  autoComplete="off"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10 w-full rounded-md border border-black/10 bg-background pl-9 pr-2 text-sm tabular-nums shadow-sm outline-none placeholder:text-black/35 focus-visible:ring-2 focus-visible:ring-black/20 dark:border-white/10 dark:placeholder:text-white/35 dark:focus-visible:ring-white/20"
                />
              </span>
            </label>
            <label className="flex min-w-[10rem] flex-col gap-1">
              <span className="text-[10px] font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
                End date
              </span>
              <span className="relative flex items-center">
                <Calendar className="pointer-events-none absolute left-2.5 h-4 w-4 text-black/40 dark:text-white/40" />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="YYYY/MM/DD"
                  autoComplete="off"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-10 w-full rounded-md border border-black/10 bg-background pl-9 pr-2 text-sm tabular-nums shadow-sm outline-none placeholder:text-black/35 focus-visible:ring-2 focus-visible:ring-black/20 dark:border-white/10 dark:placeholder:text-white/35 dark:focus-visible:ring-white/20"
                />
              </span>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isFetching}
            onClick={() =>
              startFetching(async () => {
                setError(null);
                setInfoMessage(null);
                setSavedCount(null);
                const pre = resolveGmailRangeFromParams(startDate, endDate);
                if (!pre.ok) {
                  setError(pre.error);
                  setItems([]);
                  return;
                }
                const params = new URLSearchParams();
                const s = startDate.trim();
                const e = endDate.trim();
                if (s) params.set("start_date", s);
                if (e) params.set("end_date", e);
                const qs = params.toString();
                const res = await fetch(
                  qs ? `/api/gmail/preview?${qs}` : "/api/gmail/preview",
                );
                const json = (await res.json()) as {
                  items?: PreviewItem[];
                  error?: string;
                  message?: string | null;
                };
                if (!res.ok) {
                  const err = json.error ?? "Failed to fetch Gmail preview";
                  setError(
                    err === GMAIL_REAUTH_REQUIRED
                      ? "Google needs you to sign in again for Gmail access. Sign out, then sign back in."
                      : String(err),
                  );
                  setItems([]);
                  setInfoMessage(null);
                  return;
                }
                const nextItems = json.items ?? [];
                setItems(nextItems);
                setInfoMessage(
                  nextItems.length === 0 && json.message
                    ? json.message
                    : null,
                );
              })
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-black px-3 text-sm font-medium text-white hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-black dark:hover:bg-white/80"
          >
            <Download className="h-4 w-4" />
            {isFetching ? "Fetching…" : "Fetch"}
          </button>
          <button
            type="button"
            disabled={isSaving || unsyncedItems.length === 0}
            onClick={() =>
              startSaving(async () => {
                setError(null);
                setInfoMessage(null);
                setSavedCount(null);
                const res = await fetch("/api/gmail/save", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    items: unsyncedItems.map((item) => ({
                      date: item.date,
                      parsed: {
                        amount: item.parsed.amount,
                        merchant: item.parsed.merchant,
                        type: item.parsed.type,
                      },
                    })),
                  }),
                });
                const json = (await res.json()) as {
                  saved?: number;
                  requested?: number;
                  error?: string;
                };
                if (!res.ok) {
                  setError(json.error ?? "Failed to save");
                  return;
                }
                setSavedCount(json.saved ?? 0);
                setItems([]);
                router.refresh();
              })
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-black/10 bg-background px-3 text-sm font-medium hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:hover:bg-white/10"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? "Saving…" : unsyncedItems.length === 0 ? "Already Synced" : "Save to Supabase"}
          </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-2 border-b border-black/10 px-4 py-3 text-sm text-red-700 dark:border-white/10 dark:text-red-300">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{error}</div>
        </div>
      ) : null}

      {infoMessage && !error ? (
        <div className="flex items-start gap-2 border-b border-black/10 bg-black/[0.02] px-4 py-3 text-sm text-black/70 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-black/50 dark:text-white/50" />
          <div>{infoMessage}</div>
        </div>
      ) : null}

      <AnimatePresence>
        {savedCount !== null ? (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            className="fixed bottom-6 right-6 z-50 w-[min(420px,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-black/10 bg-white/70 p-4 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-black/40"
          >
            <div className="flex items-start gap-3">
              <motion.div
                initial={{ scale: 0.85 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 18 }}
                className="mt-0.5 rounded-xl bg-emerald-500/15 p-2 text-emerald-700 dark:text-emerald-200"
              >
                <CheckCircle2 className="h-4 w-4" />
              </motion.div>
              <div className="min-w-0">
                <p className="text-sm font-medium">Saved to Supabase</p>
                <p className="text-sm text-black/60 dark:text-white/60">
                  Added <span className="font-medium">{savedCount}</span> transactions.
                </p>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="grid grid-cols-3 gap-2 border-b border-black/10 bg-background px-4 py-2 text-xs font-medium uppercase tracking-wide text-black/60 dark:border-white/10 dark:text-white/60">
        <div>Date</div>
        <div>Merchant</div>
        <div className="text-right">Amount</div>
      </div>

      {items.length === 0 ? (
        <div className="px-4 py-10 text-sm text-black/60 dark:text-white/60">
          {infoMessage ? null : "Nothing fetched yet."}
        </div>
      ) : (
        <div className="divide-y divide-black/10 dark:divide-white/10">
          {items.map((i) => (
            <div key={i.id} className="grid grid-cols-3 gap-2 px-4 py-3 text-sm">
              <div className="tabular-nums text-black/70 dark:text-white/70">{i.date}</div>
              <div className="flex items-center gap-2 font-medium">
                {i.parsed.merchant ?? (
                  <span className="text-black/40 dark:text-white/40">Unparsed</span>
                )}
                {typeof i.parsed.amount === "number" &&
                typeof i.parsed.merchant === "string" &&
                i.parsed.merchant.trim().length > 0 &&
                syncedSet.has(
                  keyForTransaction({
                    date: i.date,
                    merchant: i.parsed.merchant,
                    amount: i.parsed.amount,
                  }),
                ) ? (
                  <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                    Synced
                  </span>
                ) : null}
              </div>
              <div className="text-right tabular-nums">
                {typeof i.parsed.amount === "number" ? (
                  formatINR(i.parsed.amount)
                ) : (
                  <span className="text-black/40 dark:text-white/40">Unparsed</span>
                )}
              </div>
              <div className="col-span-3 text-xs text-black/50 dark:text-white/50">
                {i.snippet}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

