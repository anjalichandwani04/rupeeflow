"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatINR } from "@/lib/finance";

export type CategoryDatum = {
  category: string;
  spent: number;
};

export function SpendingByCategoryChart({ data }: { data: CategoryDatum[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
          <XAxis
            dataKey="category"
            tickLine={false}
            axisLine={false}
            fontSize={12}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={12}
            tickFormatter={(v) => formatINR(Number(v))}
            width={80}
          />
          <Tooltip
            formatter={(value) => formatINR(Number(value))}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.08)",
              background: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(10px)",
            }}
          />
          <Bar dataKey="spent" radius={[10, 10, 0, 0]} fill="currentColor" className="text-black dark:text-white" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

