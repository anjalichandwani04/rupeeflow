import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { fetchLatestTransactionEmails } from "@/lib/google/gmail";
import { getValidGoogleAccessToken } from "@/lib/supabase/nextauth-admin";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const accessToken = await getValidGoogleAccessToken(userId);
    const items = await fetchLatestTransactionEmails(accessToken, 10);
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
