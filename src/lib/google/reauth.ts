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

export function gmailApiRequiresReauth(status: number, body: string): boolean {
  if (status === 401 || status === 403) return true;
  return responseIndicatesInvalidGrant(status, body);
}
