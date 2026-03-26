import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import { categorizeMerchant, CATEGORY_OPTIONS, type Category } from "@/lib/finance";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Body = {
  amount: number | string;
  merchant: string;
  category?: string;
  type?: "debit" | "credit";
  // Optional: let callers override the transaction date.
  date?: string; // expected YYYY-MM-DD
};

function asISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const merchant = typeof body.merchant === "string" ? body.merchant.trim() : "";
  const rawCategory =
    typeof body.category === "string" && body.category.trim().length > 0
      ? body.category.trim()
      : undefined;
  const type = body.type === "credit" ? "credit" : "debit";

  const amountNum =
    typeof body.amount === "string"
      ? Number(body.amount)
      : typeof body.amount === "number"
        ? body.amount
        : NaN;

  if (!merchant) {
    return NextResponse.json({ error: "Missing merchant" }, { status: 400 });
  }
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    return NextResponse.json({ error: "Missing/invalid amount" }, { status: 400 });
  }

  const date =
    typeof body.date === "string" && body.date.length >= 10 ? body.date.slice(0, 10) : asISODate(new Date());

  const category: Category =
    rawCategory && (CATEGORY_OPTIONS as readonly string[]).includes(rawCategory)
      ? (rawCategory as Category)
      : categorizeMerchant(merchant);

  const supabase = supabaseAdmin();
  const { error } = await supabase.from("transactions").insert({
    user_email: email,
    date,
    merchant,
    amount: amountNum,
    category,
    type,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

