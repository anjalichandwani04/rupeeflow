"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Download, Loader2, Save, TriangleAlert } from "lucide-react";

type PreviewItem = {
  id: string;
  date: string;
  snippet: string;
  parsed: { amount?: number; merchant?: string };
};

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function GmailPreview() {
  const router = useRouter();
  const [items, setItems] = useState<PreviewItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [isFetching, startFetching] = useTransition();
  const [isSaving, startSaving] = useTransition();

  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
      <div className="flex flex-col gap-3 border-b border-black/10 bg-black/5 px-4 py-3 dark:border-white/10 dark:bg-white/10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Gmail preview (transaction emails)</p>
          <p className="text-sm text-black/60 dark:text-white/60">
            Fetch the 10 most recent emails matching keywords like{" "}
            <span className="font-medium">debited</span>,{" "}
            <span className="font-medium">spent</span>, or{" "}
            <span className="font-medium">transaction</span>, parse Amount + Merchant, then save.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isFetching}
            onClick={() =>
              startFetching(async () => {
                setError(null);
                setSavedCount(null);
                const res = await fetch("/api/gmail/preview");
                const json = (await res.json()) as { items?: PreviewItem[]; error?: string };
                if (!res.ok) {
                  setError(json.error ?? "Failed to fetch Gmail preview");
                  setItems([]);
                  return;
                }
                setItems(json.items ?? []);
              })
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-black px-3 text-sm font-medium text-white hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-black dark:hover:bg-white/80"
          >
            <Download className="h-4 w-4" />
            {isFetching ? "Fetching…" : "Fetch latest"}
          </button>
          <button
            type="button"
            disabled={isSaving || items.length === 0}
            onClick={() =>
              startSaving(async () => {
                setError(null);
                setSavedCount(null);
                const res = await fetch("/api/gmail/save", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ items }),
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
            {isSaving ? "Saving…" : "Save to Supabase"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-2 border-b border-black/10 px-4 py-3 text-sm text-red-700 dark:border-white/10 dark:text-red-300">
          <TriangleAlert className="mt-0.5 h-4 w-4" />
          <div>{error}</div>
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
          Nothing fetched yet.
        </div>
      ) : (
        <div className="divide-y divide-black/10 dark:divide-white/10">
          {items.map((i) => (
            <div key={i.id} className="grid grid-cols-3 gap-2 px-4 py-3 text-sm">
              <div className="tabular-nums text-black/70 dark:text-white/70">{i.date}</div>
              <div className="font-medium">
                {i.parsed.merchant ?? (
                  <span className="text-black/40 dark:text-white/40">Unparsed</span>
                )}
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

