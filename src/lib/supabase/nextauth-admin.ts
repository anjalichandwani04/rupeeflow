import { createClient } from "@supabase/supabase-js";
import { refreshGoogleAccessToken } from "@/lib/google/oauth";

/**
 * Service-role client scoped to the `next_auth` schema (Auth.js / @auth/supabase-adapter).
 * Used to read/update OAuth tokens in `next_auth.accounts` when using database sessions.
 */
export function supabaseNextAuthAdmin() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient(url, key, {
    db: { schema: "next_auth" },
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "X-Client-Info": "rupeeflow-nextauth-admin" } },
  });
}

export type GoogleAccountRow = {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
};

/**
 * Returns a valid Google access token for Gmail API calls, refreshing and persisting when needed.
 */
export async function getValidGoogleAccessToken(userId: string): Promise<string> {
  const supabase = supabaseNextAuthAdmin();
  const { data: row, error } = await supabase
    .from("accounts")
    .select("access_token, refresh_token, expires_at")
    .eq("userId", userId)
    .eq("provider", "google")
    .maybeSingle();

  if (error) throw error;
  if (!row?.access_token && !row?.refresh_token) {
    throw new Error(
      "No Google OAuth tokens found. Sign out and sign in again with Gmail scope.",
    );
  }

  let accessToken = row.access_token ?? "";
  const refreshToken = row.refresh_token;
  const expiresAtSec = row.expires_at;

  const expiresAtMs =
    typeof expiresAtSec === "number" ? expiresAtSec * 1000 : null;
  const needsRefresh =
    !accessToken ||
    (expiresAtMs !== null && expiresAtMs <= Date.now() + 30_000);

  if (needsRefresh) {
    if (!refreshToken) {
      throw new Error(
        "Google access token expired and no refresh token. Sign in again.",
      );
    }
    const refreshed = await refreshGoogleAccessToken(refreshToken);
    accessToken = refreshed.accessToken;
    const newExpiresAt = Math.floor(refreshed.accessTokenExpiresAt / 1000);

    const { error: upErr } = await supabase
      .from("accounts")
      .update({
        access_token: accessToken,
        expires_at: newExpiresAt,
      })
      .eq("userId", userId)
      .eq("provider", "google");

    if (upErr) throw upErr;
  }

  return accessToken;
}
