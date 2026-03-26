import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { fetchLatestTransactionEmails } from "@/lib/google/gmail";
import { getValidGoogleAccessToken } from "@/lib/supabase/nextauth-admin";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function parseYmd(s: string | null): string | undefined {
  if (!s) return undefined;
  const t = s.trim();
  if (!YMD.test(t)) return undefined;
  const d = new Date(t + "T12:00:00");
  if (Number.isNaN(d.getTime())) return undefined;
  return t;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const startDate = parseYmd(searchParams.get("startDate"));
  const endDate = parseYmd(searchParams.get("endDate"));

  if (searchParams.has("startDate") && !startDate) {
    return NextResponse.json({ error: "Invalid startDate (use YYYY-MM-DD)" }, { status: 400 });
  }
  if (searchParams.has("endDate") && !endDate) {
    return NextResponse.json({ error: "Invalid endDate (use YYYY-MM-DD)" }, { status: 400 });
  }
  if (startDate && endDate && startDate > endDate) {
    return NextResponse.json({ error: "startDate must be on or before endDate" }, { status: 400 });
  }

  try {
    const accessToken = await getValidGoogleAccessToken(userId);
    const range =
      startDate || endDate ? { startDate, endDate } : undefined;
    const items = await fetchLatestTransactionEmails(accessToken, 10, range);
    return NextResponse.json({ items });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";

    if (message.includes("401")) {
      return NextResponse.json(
        {
          error:
            "Gmail unauthorized. Please sign out and sign in again to grant Gmail access.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
