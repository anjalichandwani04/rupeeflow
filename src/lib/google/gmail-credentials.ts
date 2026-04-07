import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { allowGmailDiskFiles } from "@/lib/google/runtime-env";

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
 * Order: embedded in token JSON → GMAIL_CREDENTIALS env (JSON.parse) → credentials.json (dev only) → GOOGLE_* env.
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

  if (allowGmailDiskFiles()) {
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
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing Google OAuth client: set GMAIL_CREDENTIALS, add scripts/credentials.json (local dev), or set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
    );
  }
  return { clientId, clientSecret };
}
