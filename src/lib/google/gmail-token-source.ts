import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { resolveGoogleOAuthClientCredentials } from "@/lib/google/gmail-credentials";
import { refreshGoogleAccessToken } from "@/lib/google/oauth";
import { allowGmailDiskFiles } from "@/lib/google/runtime-env";

const TOKEN_REL = path.join("scripts", "token.json");

function loadGmailUserTokenJson(): Record<string, unknown> | null {
  const raw = process.env.GMAIL_TOKEN?.trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object") {
        throw new Error("expected a JSON object");
      }
      return parsed as Record<string, unknown>;
    } catch (e) {
      throw new Error(
        `GMAIL_TOKEN must be valid JSON (Google authorized-user token). ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  if (!allowGmailDiskFiles()) {
    return null;
  }

  const tokenPath = path.join(process.cwd(), TOKEN_REL);
  if (!existsSync(tokenPath)) return null;
  try {
    const parsed: unknown = JSON.parse(readFileSync(tokenPath, "utf8"));
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Uses `process.env.GMAIL_TOKEN` (JSON.parse) first, then `scripts/token.json` only when
 * not on Vercel/production (`allowGmailDiskFiles()`).
 */
export async function getAccessTokenFromGmailTokenEnvOrFile(): Promise<string | null> {
  const data = loadGmailUserTokenJson();
  if (!data) return null;

  const refreshToken =
    typeof data.refresh_token === "string" && data.refresh_token ? data.refresh_token : "";
  const access =
    (typeof data.token === "string" && data.token) ||
    (typeof data.access_token === "string" && data.access_token) ||
    "";

  let expiryMs: number | null = null;
  if (typeof data.expiry === "string") {
    const t = Date.parse(data.expiry);
    if (!Number.isNaN(t)) expiryMs = t;
  }

  const needsRefresh =
    !access || (expiryMs !== null && expiryMs <= Date.now() + 30_000);

  if (!needsRefresh) {
    return access;
  }

  if (!refreshToken) {
    throw new Error(
      "Gmail access token is missing or expired and no refresh_token was found in GMAIL_TOKEN / token.json.",
    );
  }

  const client = resolveGoogleOAuthClientCredentials(data);
  const refreshed = await refreshGoogleAccessToken(refreshToken, client);
  return refreshed.accessToken;
}
