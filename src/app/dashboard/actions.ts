"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { Category } from "@/lib/finance";
import { CATEGORY_OPTIONS } from "@/lib/finance";
import {
  clearUserTransactions,
  insertDemoSyncedTransaction,
  updateMonthlyBudget,
  updateTransactionCategory,
} from "@/lib/transactions";

export async function syncGmail() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) throw new Error("Unauthorized");

  await insertDemoSyncedTransaction(email);
}

export async function setMonthlyBudgetAction(amount: number) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) throw new Error("Unauthorized");
  await updateMonthlyBudget(email, amount);
}

export async function resetAllTransactionsAction() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) throw new Error("Unauthorized");
  await clearUserTransactions(email);
}

export async function updateTransactionCategoryAction(
  transactionId: string,
  category: Category,
) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) throw new Error("Unauthorized");
  if (!CATEGORY_OPTIONS.includes(category)) {
    throw new Error("Invalid category");
  }
  await updateTransactionCategory(email, transactionId, category);
}

