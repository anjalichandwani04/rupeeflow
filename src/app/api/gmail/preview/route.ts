import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { resolveGmailRangeFromParams } from "@/lib/date-range";
import { fetchLatestTransactionEmails } from "@/lib/google/gmail";
import { getValidGoogleAccessToken } from "@/lib/supabase/nextauth-admin";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const resolved = resolveGmailRangeFromParams(
    searchParams.get("start_date"),
    searchParams.get("end_date"),
  );

  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }

  const range = { startDate: resolved.startIso, endDate: resolved.endIso };

  try {
    const accessToken = await getValidGoogleAccessToken(userId);
    const { items, message } = await fetchLatestTransactionEmails(accessToken, 10, range);
    return NextResponse.json({ items, message: message ?? null });
  } catch (e) {
    const err = e instanceof Error ? e.message : "Unknown error";

    if (err.includes("401")) {
      return NextResponse.json(
        {
          error:
            "Gmail unauthorized. Please sign out and sign in again to grant Gmail access.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json({ error: err }, { status: 500 });
  }
}
