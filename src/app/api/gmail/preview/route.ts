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
    // THIS LOGS THE REAL ERROR TO VERCEL/TERMINAL
    console.error("FULL GMAIL ERROR:", e); 
    
    const err = e instanceof Error ? e.message : String(e);

    // This helps us see if it's a 400, 401, or 403
    return NextResponse.json(
      { 
        error: `Gmail Error: ${err}`, 
        details: e instanceof Error ? e.stack : undefined 
      }, 
      { status: 500 }
    );
  }

//     return NextResponse.json({ error: err }, { status: 500 });
//   }
}
