import { supabaseAdmin } from "@/lib/supabase/admin";

export type TransactionRow = {
  id: string;
  user_email: string;
  date: string; // YYYY-MM-DD
  merchant: string;
  amount: number;
  category?: string | null;
  created_at: string;
};

export async function listTransactionsForUser(email: string, limit = 50) {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("transactions")
    .select("id,user_email,date,merchant,amount,category,created_at")
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
  });

  if (error) throw error;
}

export type NewTransactionInput = {
  user_email: string;
  date: string; // YYYY-MM-DD
  merchant: string;
  amount: number;
  category?: string;
};

export async function insertTransactions(rows: NewTransactionInput[]) {
  if (rows.length === 0) return;
  const supabase = supabaseAdmin();
  const { error } = await supabase.from("transactions").insert(rows);
  if (error) throw error;
}

