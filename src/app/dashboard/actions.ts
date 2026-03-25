"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  clearUserTransactions,
  insertDemoSyncedTransaction,
  updateMonthlyBudget,
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

