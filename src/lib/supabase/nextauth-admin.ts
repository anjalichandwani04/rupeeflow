import { createClient } from "@supabase/supabase-js";
import { resolveGoogleOAuthClientCredentials } from "@/lib/google/gmail-credentials";
import { getAccessTokenFromGmailTokenEnvOrFile } from "@/lib/google/gmail-token-source";
import { refreshGoogleAccessToken } from "@/lib/google/oauth";
import { GMAIL_REAUTH_REQUIRED } from "@/lib/google/reauth";

/** `expires_at` from Postgres may be number, string, or bigint — normalize to Unix seconds. */
function coerceExpiresAtSeconds(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

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
    const expiresAtSec = coerceExpiresAtSeconds(row.expires_at);
    const expiresAtMs =
      expiresAtSec !== null ? expiresAtSec * 1000 : null;

    const tokenLikelyExpired =
      expiresAtMs === null || expiresAtMs <= Date.now() + 30_000;

    // Access token but no refresh token: only safe if expiry is still in the future
    if (accessToken && !refreshToken) {
      if (tokenLikelyExpired) {
        throw new Error(GMAIL_REAUTH_REQUIRED);
      }
      return accessToken;
    }

    const needsRefresh = !accessToken || tokenLikelyExpired;

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
