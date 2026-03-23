import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowRight, Mail, Sparkles } from "lucide-react";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <div className="py-12">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/5 px-3 py-1 text-sm dark:border-white/10 dark:bg-white/10">
            <Sparkles className="h-4 w-4" />
            <span>Expense tracker built for India</span>
          </div>

          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Track expenses automatically with RupeeFlow.
          </h1>

          <p className="text-pretty text-base leading-7 text-black/70 dark:text-white/70">
            Sign in with Google, sync Gmail purchase emails, and keep a clean
            ledger of transactions in Supabase.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {session ? (
              <Link
                href="/dashboard"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-black px-4 text-sm font-medium text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80"
              >
                Go to dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href="/api/auth/signin"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-black px-4 text-sm font-medium text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80"
              >
                Sign in with Google <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            <a
              className="inline-flex h-11 items-center justify-center rounded-md border border-black/10 px-4 text-sm font-medium hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
              href="https://supabase.com/"
              target="_blank"
              rel="noreferrer"
            >
              Connect Supabase
            </a>
          </div>

          {session?.user?.email ? (
            <p className="text-sm text-black/60 dark:text-white/60">
              Signed in as <span className="font-medium">{session.user.email}</span>
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-black/10 bg-gradient-to-br from-black/[0.03] to-transparent p-6 dark:border-white/10 dark:from-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-black p-3 text-white dark:bg-white dark:text-black">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">Gmail Sync</p>
              <p className="text-sm text-black/60 dark:text-white/60">
                Import purchases and subscriptions
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-xl border border-black/10 bg-background dark:border-white/10">
            <div className="grid grid-cols-3 border-b border-black/10 bg-black/5 px-4 py-2 text-xs font-medium uppercase tracking-wide text-black/70 dark:border-white/10 dark:bg-white/10 dark:text-white/70">
              <div>Date</div>
              <div>Merchant</div>
              <div className="text-right">Amount</div>
            </div>
            <div className="divide-y divide-black/10 text-sm dark:divide-white/10">
              {[
                { date: "2026-03-12", merchant: "Swiggy", amount: "₹ 420.00" },
                { date: "2026-03-09", merchant: "Amazon", amount: "₹ 1,299.00" },
                { date: "2026-03-02", merchant: "Netflix", amount: "₹ 649.00" },
              ].map((row) => (
                <div
                  key={`${row.date}-${row.merchant}`}
                  className="grid grid-cols-3 px-4 py-3"
                >
                  <div className="tabular-nums text-black/70 dark:text-white/70">
                    {row.date}
                  </div>
                  <div className="font-medium">{row.merchant}</div>
                  <div className="text-right tabular-nums">{row.amount}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
