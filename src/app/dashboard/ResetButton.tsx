"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { OctagonAlert } from "lucide-react";
import { resetAllTransactionsAction } from "./actions";

export function ResetButton() {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            "Delete all transactions for your account? This cannot be undone.",
          )
        ) {
          return;
        }
        start(async () => {
          await resetAllTransactionsAction();
          router.refresh();
        });
      }}
      className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border-2 border-red-600 bg-transparent px-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-500 dark:text-red-400 dark:hover:bg-red-950/40"
    >
      <OctagonAlert className="h-4 w-4" />
      {pending ? "Resetting…" : "Reset All"}
    </button>
  );
}
