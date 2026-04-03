"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatINR } from "@/lib/finance";

type Slice = {
  name: string;
  value: number;
  fill: string;
};

const COLORS = {
  spent: "rgb(51 65 85)", // slate-700 — visible on light + dark cards
  remaining: "rgb(16 185 129)", // emerald-500
  overage: "rgb(239 68 68)", // red-500
  muted: "rgb(148 163 184)", // slate-400
};

function buildSlices(totalSpent: number, monthlyBudget: number): Slice[] | null {
  const spent = Math.max(0, totalSpent);
  const budget = Math.max(0, monthlyBudget);

  if (budget <= 0 && spent <= 0) {
    return null;
  }

  if (budget <= 0) {
    return [{ name: "Spent", value: spent, fill: COLORS.spent }];
  }

  if (spent > budget) {
    return [{ name: "Spent", value: spent, fill: COLORS.overage }];
  }

  const remaining = budget - spent;
  if (spent <= 0) {
    return [{ name: "Remaining", value: remaining, fill: COLORS.remaining }];
  }

  return [
    { name: "Spent", value: spent, fill: COLORS.spent },
    { name: "Remaining", value: remaining, fill: COLORS.remaining },
  ];
}

export function BudgetPieChart({
  totalSpent,
  monthlyBudget,
}: {
  totalSpent: number;
  monthlyBudget: number;
}) {
  const data = buildSlices(totalSpent, monthlyBudget);
  const overBudget = monthlyBudget > 0 && totalSpent > monthlyBudget;
  const remaining = monthlyBudget > 0 ? Math.max(0, monthlyBudget - totalSpent) : 0;
  const overBy = monthlyBudget > 0 ? Math.max(0, totalSpent - monthlyBudget) : 0;

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-black/15 bg-black/[0.02] text-sm text-black/50 dark:border-white/15 dark:bg-white/[0.03] dark:text-white/50">
        Add transactions and set a monthly budget to see your split.
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="48%"
              innerRadius="58%"
              outerRadius="88%"
              paddingAngle={data.length > 1 ? 2 : 0}
              stroke="none"
            >
              {data.map((entry, i) => (
                <Cell key={entry.name + i} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => formatINR(Number(v ?? 0))}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.08)",
                background: "rgba(255,255,255,0.92)",
                backdropFilter: "blur(10px)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div
        className="pointer-events-none absolute left-1/2 top-[40%] w-[min(52%,11rem)] -translate-x-1/2 -translate-y-1/2 text-center"
        aria-hidden
      >
        {monthlyBudget <= 0 ? (
          <>
            <p className="text-xs font-medium text-black/50 dark:text-white/50">No budget set</p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
              {formatINR(totalSpent)}
            </p>
            <p className="mt-0.5 text-[10px] text-black/45 dark:text-white/45">total spent</p>
          </>
        ) : overBudget ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
              Over budget
            </p>
            <p className="mt-1 text-sm font-bold tabular-nums text-red-600 dark:text-red-400">
              {formatINR(overBy)}
            </p>
            <p className="mt-0.5 text-[10px] text-black/50 dark:text-white/50">above limit</p>
          </>
        ) : (
          <>
            <p className="text-xs text-black/50 dark:text-white/50">Budget</p>
            <p className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
              {formatINR(monthlyBudget)}
            </p>
            <p className="mt-2 text-[10px] text-black/45 dark:text-white/45">Remaining</p>
            <p className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatINR(remaining)}
            </p>
          </>
        )}
      </div>

      <div className="mt-1 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
        <LegendRow color={overBudget ? COLORS.overage : COLORS.spent} label="Spent" amount={totalSpent} />
        {monthlyBudget > 0 ? (
          <LegendRow
            color={overBudget ? COLORS.muted : COLORS.remaining}
            label="Remaining"
            amount={overBudget ? 0 : remaining}
            muted={overBudget}
          />
        ) : null}
      </div>
      {overBudget ? (
        <p className="mt-2 text-center text-xs text-red-600 dark:text-red-400">
          Spent {formatINR(totalSpent)} exceeds budget {formatINR(monthlyBudget)} — chart shows full overage in red.
        </p>
      ) : null}
    </div>
  );
}

function LegendRow({
  color,
  label,
  amount,
  muted,
}: {
  color: string;
  label: string;
  amount: number;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 tabular-nums ${muted ? "text-black/45 dark:text-white/45" : "text-black/80 dark:text-white/80"}`}
    >
      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span>
        {label}:{" "}
        <span className="font-medium">{formatINR(amount)}</span>
      </span>
    </div>
  );
}
