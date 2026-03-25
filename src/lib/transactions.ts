import { supabaseAdmin } from "@/lib/supabase/admin";

export type TransactionRow = {
  id: string;
  user_email: string;
  date: string; // YYYY-MM-DD
  merchant: string;
  amount: number;
  category?: string | null;
  /** Defaults to debit in UI when missing (legacy rows). */
  type?: "debit" | "credit" | null;
  created_at: string;
};

export async function listTransactionsForUser(email: string, limit = 50) {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("transactions")
    // 2. Added 'type' to the select query
    .select("id,user_email,date,merchant,amount,category,type,created_at")
    .eq("user_email", email)
    .order("date", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as TransactionRow[];
}

export async function insertDemoSyncedTransaction(email: string) {
  const supabase = supabaseAdmin();

  const now = new Date();
  const yyyyMmDd = now.toISOString().slice(0, 10);
  const merchants = ["Swiggy", "Amazon", "Uber", "Zomato", "Netflix", "IRCTC"];
  const merchant = merchants[Math.floor(Math.random() * merchants.length)]!;
  const amount = Number((Math.random() * 2500 + 50).toFixed(2));

  const { error } = await supabase.from("transactions").insert({
    user_email: email,
    date: yyyyMmDd,
    merchant,
    amount,
    type: "debit",
  });

  if (error) throw error;
}

export type NewTransactionInput = {
  user_email: string;
  date: string; // YYYY-MM-DD
  merchant: string;
  amount: number;
  category?: string;
  type?: "debit" | "credit";
};

export async function insertTransactions(rows: NewTransactionInput[]) {
  if (rows.length === 0) return;
  const supabase = supabaseAdmin();
  const { error } = await supabase.from("transactions").insert(rows);
  if (error) throw error;
}

const DEFAULT_MONTHLY_BUDGET = 25_000;

export async function getMonthlyBudget(email: string): Promise<number> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("user_settings")
    .select("monthly_budget")
    .eq("email", email)
    .maybeSingle();

  if (error) throw error;
  const v = data?.monthly_budget;
  if (v === null || v === undefined) return DEFAULT_MONTHLY_BUDGET;
  const n = Number(v);
  return Number.isFinite(n) ? n : DEFAULT_MONTHLY_BUDGET;
}

export async function updateMonthlyBudget(email: string, amount: number) {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Invalid monthly budget");
  }
  const supabase = supabaseAdmin();
  const { error } = await supabase.from("user_settings").upsert(
    { email, monthly_budget: amount },
    { onConflict: "email" },
  );
  if (error) throw error;
}

export async function clearUserTransactions(email: string) {
  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("user_email", email);
  if (error) throw error;
}