"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PencilLine } from "lucide-react";
import { setMonthlyBudgetAction } from "./actions";

type Props = {
  initialBudget: number;
};

export function BudgetEditor({ initialBudget }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(String(initialBudget));
  const [pending, start] = useTransition();

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="monthly-budget-input">
        Monthly budget amount
      </label>
      <input
        id="monthly-budget-input"
        type="number"
        min={0}
        step={100}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-9 w-28 rounded-md border border-black/15 bg-white/80 px-2 text-sm tabular-nums dark:border-white/15 dark:bg-black/30"
      />
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const n = Number(value);
            if (!Number.isFinite(n) || n < 0) return;
            await setMonthlyBudgetAction(n);
            router.refresh();
          })
        }
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-black/10 bg-black px-2.5 text-xs font-medium text-white hover:bg-black/85 disabled:opacity-60 dark:border-white/10 dark:bg-white dark:text-black dark:hover:bg-white/90"
      >
        <PencilLine className="h-3.5 w-3.5" />
        {pending ? "Saving…" : "Set Budget"}
      </button>
    </div>
  );
}
