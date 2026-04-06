import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { refreshGoogleAccessToken } from "@/lib/google/oauth";

const TOKEN_REL = path.join("scripts", "token.json");
const CREDENTIALS_REL = path.join("scripts", "credentials.json");

type GoogleClientBlock = {
  client_id?: string;
  client_secret?: string;
};

function parseInstalledClientJson(
  parsed: unknown,
): { clientId: string; clientSecret: string } | null {
  if (!parsed || typeof parsed !== "object") return null;
  const o = parsed as { installed?: GoogleClientBlock; web?: GoogleClientBlock };
  const block = o.installed ?? o.web;
  const clientId = block?.client_id;
  const clientSecret = block?.client_secret;
  if (typeof clientId === "string" && typeof clientSecret === "string" && clientId && clientSecret) {
    return { clientId, clientSecret };
  }
  return null;
}

/**
 * OAuth client id/secret for token refresh.
 * Order: GMAIL_CREDENTIALS env (JSON.parse) → scripts/credentials.json → GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.
 */
export function resolveGoogleOAuthClientCredentials(
  tokenJson?: Record<string, unknown> | null,
): { clientId: string; clientSecret: string } {
  if (tokenJson) {
    const id = tokenJson.client_id;
    const sec = tokenJson.client_secret;
    if (typeof id === "string" && typeof sec === "string" && id && sec) {
      return { clientId: id, clientSecret: sec };
    }
  }

  const rawCred = process.env.GMAIL_CREDENTIALS?.trim();
  if (rawCred) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawCred);
    } catch (e) {
      throw new Error(
        `GMAIL_CREDENTIALS must be valid JSON (OAuth client download). ${e instanceof Error ? e.message : String(e)}`,
      );
    }
    const fromEnv = parseInstalledClientJson(parsed);
    if (fromEnv) return fromEnv;
    throw new Error(
      "GMAIL_CREDENTIALS JSON must include an `installed` (or `web`) object with client_id and client_secret.",
    );
  }

  const credPath = path.join(process.cwd(), CREDENTIALS_REL);
  if (existsSync(credPath)) {
    try {
      const parsed: unknown = JSON.parse(readFileSync(credPath, "utf8"));
      const fromFile = parseInstalledClientJson(parsed);
      if (fromFile) return fromFile;
    } catch {
      /* fall through */
    }
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing Google OAuth client: set GMAIL_CREDENTIALS, add scripts/credentials.json, or set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
    );
  }
  return { clientId, clientSecret };
}

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
 * If GMAIL_TOKEN is set (or scripts/token.json exists), return a valid Gmail access token.
 * Intended for Vercel / CI where token.json is not deployed.
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
