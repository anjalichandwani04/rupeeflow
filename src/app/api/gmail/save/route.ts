import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import { insertTransactions } from "@/lib/transactions";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        items?: Array<{
          date?: string;
          parsed?: { amount?: number; merchant?: string; type?: "debit" | "credit" };
        }>;
      }
    | null;

  const items = body?.items ?? [];
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "No items provided" }, { status: 400 });
  }

  const rows = items
    .map((i) => ({
      user_email: email,
      date: typeof i.date === "string" ? i.date : new Date().toISOString().slice(0, 10),
      merchant: i.parsed?.merchant,
      amount: i.parsed?.amount,
      type: i.parsed?.type ?? "debit",
    }))
    .filter(
      (
        r,
      ): r is {
        user_email: string;
        date: string;
        merchant: string;
        amount: number;
        type: "debit" | "credit";
      } =>
        typeof r.merchant === "string" &&
        r.merchant.length > 0 &&
        typeof r.amount === "number" &&
        Number.isFinite(r.amount),
    );

  try {
    await insertTransactions(rows);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save transactions";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ saved: rows.length, requested: items.length });
}
