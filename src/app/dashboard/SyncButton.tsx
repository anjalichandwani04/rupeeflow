"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RefreshCcw } from "lucide-react";
import { syncGmail } from "./actions";

export function SyncButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await syncGmail();
          router.refresh();
        })
      }
      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-black px-3 text-sm font-medium text-white hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-black dark:hover:bg-white/80"
    >
      <RefreshCcw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
      {isPending ? "Syncing…" : "Sync Gmail"}
    </button>
  );
}

