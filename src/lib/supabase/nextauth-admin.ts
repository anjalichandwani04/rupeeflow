import { createClient } from "@supabase/supabase-js";
import { resolveGoogleOAuthClientCredentials } from "@/lib/google/gmail-credentials";
import { getAccessTokenFromGmailTokenEnvOrFile } from "@/lib/google/gmail-token-source";
import { refreshGoogleAccessToken } from "@/lib/google/oauth";
import { GMAIL_REAUTH_REQUIRED } from "@/lib/google/reauth";

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
 * Returns a valid Google access token for Gmail API calls.
 *
 * 1. **Supabase `next_auth.accounts`** (preferred) — refresh + persist `access_token` and
 *    `expires_at` so all devices using the same account stay in sync.
 * 2. **`GMAIL_TOKEN` env** (JSON.parse), then local `scripts/token.json` only when not in
 *    production/Vercel — fallback when no DB row exists (e.g. automation).
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

  const hasDbTokens = Boolean(row && (row.access_token || row.refresh_token));

  if (hasDbTokens && row) {
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
        throw new Error(GMAIL_REAUTH_REQUIRED);
      }
      const client = resolveGoogleOAuthClientCredentials(null);
      const refreshed = await refreshGoogleAccessToken(refreshToken, client);
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

  const fromEnv = await getAccessTokenFromGmailTokenEnvOrFile();
  if (fromEnv) return fromEnv;

  throw new Error(
    "No Google OAuth tokens found. Sign out and sign in again with Gmail scope.",
  );
}
