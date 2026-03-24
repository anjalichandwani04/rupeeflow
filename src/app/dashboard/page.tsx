// import { getServerSession } from "next-auth";
// import { redirect } from "next/navigation";
// import { ArrowUpRight, IndianRupee, ListOrdered, PiggyBank, Sparkles } from "lucide-react";
// import { authOptions } from "@/lib/auth";
// import { listTransactionsForUser } from "@/lib/transactions";
// import { GmailPreview } from "./GmailPreview";
// import { categorizeMerchant, formatINR } from "@/lib/finance";
// import { SpendingByCategoryChart } from "./SpendingByCategoryChart";

// export default async function DashboardPage() {
//   const session = await getServerSession(authOptions);
//   const email = session?.user?.email;
//   if (!email) redirect("/api/auth/signin?callbackUrl=/dashboard");

//   const transactions = await listTransactionsForUser(email);
//   const totalSpent = transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
//   const monthlyBudget = 25_000;
//   const byCategory = new Map<string, number>();
//   for (const t of transactions) {
//     const category = categorizeMerchant(t.merchant);
//     byCategory.set(category, (byCategory.get(category) ?? 0) + (Number(t.amount) || 0));
//   }
//   const chartData = Array.from(byCategory.entries())
//     .map(([category, spent]) => ({ category, spent }))
//     .sort((a, b) => b.spent - a.spent)
//     .slice(0, 6);

//   return (
//     <div className="space-y-8">
//       <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
//         <div className="space-y-2">
//           <div className="inline-flex items-center gap-2 text-sm text-black/60 dark:text-white/60">
//             <IndianRupee className="h-4 w-4" />
//             <span>RupeeFlow Dashboard</span>
//           </div>
//           <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
//           <p className="text-sm text-black/60 dark:text-white/60">
//             Signed in as <span className="font-medium">{email}</span>
//           </p>
//         </div>
//       </div>

//        <div className="grid gap-4 md:grid-cols-3">
//          <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white/40 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
//            <div className="flex items-start justify-between gap-3">
//              <div>
//                <p className="text-sm text-black/60 dark:text-white/60">Total Spent</p>
//                <p className="mt-1 text-2xl font-semibold tracking-tight">
//                  {formatINR(totalSpent)}
//                </p>
//              </div>
//              <div className="rounded-xl bg-black/5 p-2 text-black dark:bg-white/10 dark:text-white">
//                <Sparkles className="h-4 w-4" />
//              </div>
//            </div>
//            <div className="mt-3 text-xs text-black/50 dark:text-white/50">
//              Across {transactions.length} transactions
//            </div>
//            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-emerald-400/25 to-sky-400/0 blur-2xl" />
//          </div>

//         <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white/40 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
//            <div className="flex items-start justify-between gap-3">
//              <div>
//                <p className="text-sm text-black/60 dark:text-white/60">Monthly Budget</p>
//                <p className="mt-1 text-2xl font-semibold tracking-tight">
//                  {formatINR(monthlyBudget)}
//                </p>
//              </div>
//              <div className="rounded-xl bg-black/5 p-2 text-black dark:bg-white/10 dark:text-white">
//                <PiggyBank className="h-4 w-4" />
//              </div>
//            </div>
//            <div className="mt-3 text-xs text-black/50 dark:text-white/50">
//              Update this value in `src/app/dashboard/page.tsx`
//            </div>
//            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-fuchsia-400/20 to-amber-400/0 blur-2xl" />
//          </div>

//          <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white/40 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
//            <div className="flex items-start justify-between gap-3">
//              <div>
//                <p className="text-sm text-black/60 dark:text-white/60">Transactions Synced</p>
//                <p className="mt-1 text-2xl font-semibold tracking-tight">
//                  {transactions.length}
//                </p>
//              </div>
//              <div className="rounded-xl bg-black/5 p-2 text-black dark:bg-white/10 dark:text-white">
//                <ArrowUpRight className="h-4 w-4" />
//              </div>
//            </div>
//            <div className="mt-3 text-xs text-black/50 dark:text-white/50">
//              Saved to Supabase
//            </div>
//            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-400/20 to-cyan-400/0 blur-2xl" />
//          </div>
//        </div>

//        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white/40 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
//          <div className="flex items-center justify-between gap-3">
//            <div>
//              <p className="text-sm font-medium">Spending by category</p>
//              <p className="text-sm text-black/60 dark:text-white/60">
//                Auto-categorized from merchant names
//              </p>
//            </div>
//          </div>
//          <div className="mt-4">
//            <SpendingByCategoryChart data={chartData.length ? chartData : [{ category: "Other", spent: 0 }]} />
//          </div>
//        </div>

//        <GmailPreview />

//        <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
//          <div className="flex items-center justify-between border-b border-black/10 bg-black/5 px-4 py-3 dark:border-white/10 dark:bg-white/10">
//            <div className="flex items-center gap-2 text-sm font-medium">
//              <ListOrdered className="h-4 w-4" />
//              <span>Latest</span>
//            </div>
//            <div className="text-sm text-black/60 dark:text-white/60">
//              {transactions.length} shown
//            </div>
//          </div>

//          <div className="grid grid-cols-3 gap-2 border-b border-black/10 bg-background px-4 py-2 text-xs font-medium uppercase tracking-wide text-black/60 dark:border-white/10 dark:text-white/60">
//            <div>Date</div>
//            <div>Merchant</div>
//            <div className="text-right">Amount</div>
//          </div>

//          {transactions.length === 0 ? (
//           <div className="px-4 py-10 text-sm text-black/60 dark:text-white/60">
//             No transactions yet. Fetch Gmail preview above and save to Supabase.
//           </div>
//         ) : (
//           <div className="divide-y divide-black/10 dark:divide-white/10">
//             {transactions.map((t) => (
//               <div key={t.id} className="grid grid-cols-3 gap-2 px-4 py-3 text-sm">
//                 <div className="tabular-nums text-black/70 dark:text-white/70">
//                   {t.date}
//                 </div>
//                 <div className="font-medium">{t.merchant}</div>
//                 <div className="text-right tabular-nums">{formatINR(t.amount)}</div>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }


import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ArrowUpRight, IndianRupee, ListOrdered, PiggyBank, Sparkles } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { listTransactionsForUser } from "@/lib/transactions";
import { GmailPreview } from "./GmailPreview";
import { categorizeMerchant, formatINR } from "@/lib/finance";
import { SpendingByCategoryChart } from "./SpendingByCategoryChart";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) redirect("/api/auth/signin?callbackUrl=/dashboard");

  const transactions = await listTransactionsForUser(email);

  // 📈 FIXED MATH: Add debits, subtract credits
  const totalSpent = transactions.reduce((sum, t) => {
    const amount = Number(t.amount) || 0;
    return t.type === 'credit' ? sum - amount : sum + amount;
  }, 0);

  const monthlyBudget = 25_000;
  
  const byCategory = new Map<string, number>();
  for (const t of transactions) {
    // 📁 CATEGORY FIX: Usually, we only want to chart actual spending (debits)
    if (t.type === 'credit') continue; 
    
    const category = categorizeMerchant(t.merchant);
    byCategory.set(category, (byCategory.get(category) ?? 0) + (Number(t.amount) || 0));
  }

  const chartData = Array.from(byCategory.entries())
    .map(([category, spent]) => ({ category, spent }))
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 6);

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-sm text-black/60 dark:text-white/60">
            <IndianRupee className="h-4 w-4" />
            <span>RupeeFlow Dashboard</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Signed in as <span className="font-medium">{email}</span>
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white/40 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-black/60 dark:text-white/60">Total Spent</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
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
              <p className="text-sm text-black/60 dark:text-white/60">Monthly Budget</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {formatINR(monthlyBudget)}
              </p>
            </div>
            <div className="rounded-xl bg-black/5 p-2 text-black dark:bg-white/10 dark:text-white">
              <PiggyBank className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-xs text-black/50 dark:text-white/50">
            Budget limit tracker
          </div>
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
            <p className="text-sm font-medium">Spending by category</p>
            <p className="text-sm text-black/60 dark:text-white/60">
              Auto-categorized (Excludes Credits)
            </p>
          </div>
        </div>
        <div className="mt-4">
          <SpendingByCategoryChart data={chartData.length ? chartData : [{ category: "Other", spent: 0 }]} />
        </div>
      </div>

      <GmailPreview />

      <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
        <div className="flex items-center justify-between border-b border-black/10 bg-black/5 px-4 py-3 dark:border-white/10 dark:bg-white/10">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ListOrdered className="h-4 w-4" />
            <span>Latest Transactions</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 border-b border-black/10 bg-background px-4 py-2 text-xs font-medium uppercase tracking-wide text-black/60 dark:border-white/10 dark:text-white/60">
          <div>Date</div>
          <div>Merchant</div>
          <div className="text-right">Amount</div>
        </div>

        {transactions.length === 0 ? (
          <div className="px-4 py-10 text-sm text-black/60 dark:text-white/60">
            No transactions yet. Fetch Gmail preview above.
          </div>
        ) : (
          <div className="divide-y divide-black/10 dark:divide-white/10">
            {transactions.map((t) => (
              <div key={t.id} className="grid grid-cols-3 gap-2 px-4 py-3 text-sm">
                <div className="tabular-nums text-black/70 dark:text-white/70">
                  {t.date}
                </div>
                <div className="font-medium truncate">{t.merchant}</div>
                {/* 🎨 UI FIX: Green text for credits */}
                <div className={`text-right tabular-nums font-medium ${t.type === 'credit' ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                  {t.type === 'credit' ? `+ ${formatINR(t.amount)}` : formatINR(t.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}