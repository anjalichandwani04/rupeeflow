import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  IndianRupee,
  ListOrdered,
  PiggyBank,
  Sparkles,
  Wallet,
} from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getMonthlyBudget, listTransactionsForUser } from "@/lib/transactions";
import { GmailPreview } from "./GmailPreview";
import { BudgetEditor } from "./BudgetEditor";
import { ResetButton } from "./ResetButton";
import { formatINR } from "@/lib/finance";
import { TransactionCategorySelect } from "./TransactionCategorySelect";
import { BudgetPieChart } from "./BudgetPieChart";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) redirect("/api/auth/signin?callbackUrl=/dashboard");

  const [transactions, monthlyBudget] = await Promise.all([
    listTransactionsForUser(email),
    getMonthlyBudget(email),
  ]);

  let totalSpent = 0;
  for (const t of transactions) {
    const amount = Number(t.amount) || 0;
    if (t.type === "credit") {
      totalSpent -= amount;
    } else {
      totalSpent += amount;
    }
  }

  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthLabel = now.toLocaleString("en-IN", { month: "long", year: "numeric" });

  let monthCreditsTotal = 0;
  let monthDebitsTotal = 0;
  for (const t of transactions) {
    if (!t.date?.startsWith(currentMonthPrefix)) continue;
    const amount = Number(t.amount) || 0;
    if (t.type === "credit") {
      monthCreditsTotal += amount;
    } else {
      monthDebitsTotal += amount;
    }
  }
  const monthlyNet = monthCreditsTotal - monthDebitsTotal;

  let totalDebitSpent = 0;
  for (const t of transactions) {
    if (t.type !== "debit") continue;
    totalDebitSpent += Number(t.amount) || 0;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="inline-flex items-center gap-2 text-sm text-black/60 dark:text-white/60">
            <IndianRupee className="h-4 w-4" />
            <span>RupeeFlow Dashboard</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Signed in as <span className="font-medium">{email}</span>
          </p>
        </div>
        <ResetButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white/40 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-black/60 dark:text-white/60">Total Spent</p>
              <p
                className={`mt-1 text-2xl font-semibold tracking-tight ${
                  totalSpent < 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-foreground"
                }`}
              >
                {formatINR(totalSpent)}
              </p>
            </div>
            <div className="rounded-xl bg-black/5 p-2 text-black dark:bg-white/10 dark:text-white">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-xs text-black/50 dark:text-white/50">
            Net balance across {transactions.length} transactions
          </div>
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-emerald-400/25 to-sky-400/0 blur-2xl" />
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white/40 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-black/60 dark:text-white/60">This month</p>
              <p
                className={`mt-1 text-2xl font-semibold tracking-tight ${
                  monthlyNet >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {formatINR(monthlyNet)}
              </p>
            </div>
            <div className="rounded-xl bg-black/5 p-2 text-black dark:bg-white/10 dark:text-white">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-xs text-black/50 dark:text-white/50">
            {monthLabel}: credits ({formatINR(monthCreditsTotal)}) − debits (
            {formatINR(monthDebitsTotal)})
          </div>
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-amber-400/20 to-emerald-400/0 blur-2xl" />
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white/40 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-black/60 dark:text-white/60">Monthly Budget</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {formatINR(monthlyBudget)}
              </p>
            </div>
            <div className="rounded-xl bg-black/5 p-2 text-black dark:bg-white/10 dark:text-white">
              <PiggyBank className="h-4 w-4" />
            </div>
          </div>
          <BudgetEditor key={monthlyBudget} initialBudget={monthlyBudget} />
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-fuchsia-400/20 to-amber-400/0 blur-2xl" />
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white/40 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-black/60 dark:text-white/60">Transactions Synced</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {transactions.length}
              </p>
            </div>
            <div className="rounded-xl bg-black/5 p-2 text-black dark:bg-white/10 dark:text-white">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-xs text-black/50 dark:text-white/50">
            Saved to Supabase
          </div>
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-400/20 to-cyan-400/0 blur-2xl" />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white/40 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Budget vs spending</p>
            <p className="text-sm text-black/60 dark:text-white/60">
              Spent = sum of debit transactions; remaining = monthly budget minus spent
            </p>
          </div>
        </div>
        <div className="mt-4">
          <BudgetPieChart totalSpent={totalDebitSpent} monthlyBudget={monthlyBudget} />
        </div>
      </div>

      <GmailPreview
        existingTransactions={transactions.map((t) => ({
          date: t.date,
          merchant: t.merchant,
          amount: Number(t.amount) || 0,
        }))}
      />

      <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
        <div className="flex items-center justify-between border-b border-black/10 bg-black/5 px-4 py-3 dark:border-white/10 dark:bg-white/10">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ListOrdered className="h-4 w-4" />
            <span>Latest Transactions</span>
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.1fr)_auto] gap-2 border-b border-black/10 bg-background px-4 py-2 text-xs font-medium uppercase tracking-wide text-black/60 dark:border-white/10 dark:text-white/60">
          <div>Date</div>
          <div>Merchant</div>
          <div>Category</div>
          <div className="text-right">Amount</div>
        </div>

        {transactions.length === 0 ? (
          <div className="px-4 py-10 text-sm text-black/60 dark:text-white/60">
            No transactions yet. Fetch Gmail preview above.
          </div>
        ) : (
          <div className="divide-y divide-black/10 dark:divide-white/10">
            {transactions.map((t) => (
              <div
                key={t.id}
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.1fr)_auto] items-center gap-2 px-4 py-3 text-sm"
              >
                <div className="tabular-nums text-black/70 dark:text-white/70">
                  {t.date}
                </div>
                <div className="min-w-0 font-medium truncate">{t.merchant}</div>
                <div className="min-w-0">
                  <TransactionCategorySelect
                    transactionId={t.id}
                    storedCategory={t.category}
                    merchant={t.merchant}
                  />
                </div>
                <div
                  className={`text-right tabular-nums font-medium ${
                    t.type === "credit"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : ""
                  }`}
                >
                  {t.type === "credit"
                    ? `+ ${formatINR(t.amount)}`
                    : formatINR(t.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}