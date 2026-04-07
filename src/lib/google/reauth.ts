/** Returned to clients when Google rejects the refresh token or Gmail rejects the access token. */
export const GMAIL_REAUTH_REQUIRED = "GMAIL_REAUTH_REQUIRED" as const;

export function responseIndicatesInvalidGrant(status: number, body: string): boolean {
  const t = body.toLowerCase();
  if (t.includes("invalid_grant")) return true;
  try {
    const j = JSON.parse(body) as { error?: string };
    if (j.error === "invalid_grant") return true;
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * True when Gmail/Google rejected credentials (vs e.g. quota 403).
 * Avoid treating every 403 as "sign in again" — quota and API-not-enabled use 403 too.
 */
export function gmailApiRequiresReauth(status: number, body: string): boolean {
  if (status === 401) return true;
  if (responseIndicatesInvalidGrant(status, body)) return true;
  if (status === 403) {
    const t = body.toLowerCase();
    return (
      t.includes("unauthenticated") ||
      t.includes("invalid_grant") ||
      t.includes("invalid authentication") ||
      (t.includes("oauth") && t.includes("invalid")) ||
      t.includes("insufficient authentication")
    );
  }
  return false;
}
