import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { resolveGmailRangeFromParams } from "@/lib/date-range";
import { fetchLatestTransactionEmails } from "@/lib/google/gmail";
import { GMAIL_REAUTH_REQUIRED } from "@/lib/google/reauth";
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
    const { items, message, listedCount, capped } =
      await fetchLatestTransactionEmails(accessToken, range);
    return NextResponse.json({
      items,
      message: message ?? null,
      listedCount: listedCount ?? null,
      capped: capped ?? false,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === GMAIL_REAUTH_REQUIRED) {
      return NextResponse.json(
        { error: GMAIL_REAUTH_REQUIRED },
        { status: 401 },
      );
    }
    console.error("Gmail preview error:", e);
    return NextResponse.json(
      { error: msg },
      { status: 500 },
    );
  }
}
