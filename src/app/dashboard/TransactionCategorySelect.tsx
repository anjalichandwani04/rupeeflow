"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Car, LayoutGrid, ShoppingBag, Utensils } from "lucide-react";
import {
  CATEGORY_OPTIONS,
  type Category,
  resolveCategory,
} from "@/lib/finance";
import { updateTransactionCategoryAction } from "./actions";

const iconFor: Record<Category, ReactNode> = {
  Food: <Utensils className="h-3.5 w-3.5 shrink-0" aria-hidden />,
  Transport: <Car className="h-3.5 w-3.5 shrink-0" aria-hidden />,
  Shopping: <ShoppingBag className="h-3.5 w-3.5 shrink-0" aria-hidden />,
  Other: <LayoutGrid className="h-3.5 w-3.5 shrink-0" aria-hidden />,
};

type Props = {
  transactionId: string;
  /** Raw value from DB (may be legacy). */
  storedCategory: string | null | undefined;
  merchant: string;
};

export function TransactionCategorySelect({
  transactionId,
  storedCategory,
  merchant,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const resolved = resolveCategory(storedCategory, merchant);

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="text-black/50 dark:text-white/45" title="Category">
        {iconFor[resolved]}
      </span>
      <select
        aria-label="Transaction category"
        disabled={pending}
        value={resolved}
        onChange={(e) => {
          const next = e.target.value as Category;
          start(async () => {
            await updateTransactionCategoryAction(transactionId, next);
            router.refresh();
          });
        }}
        className="max-w-full min-w-0 flex-1 rounded-md border border-black/15 bg-white/90 py-1.5 pl-2 pr-6 text-xs font-medium dark:border-white/15 dark:bg-black/40"
      >
        {CATEGORY_OPTIONS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}
