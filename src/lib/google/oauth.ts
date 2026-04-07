import {
  GMAIL_REAUTH_REQUIRED,
  responseIndicatesInvalidGrant,
} from "@/lib/google/reauth";

type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
};

function getRequiredEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export async function refreshGoogleAccessToken(
  refreshToken: string,
  client?: { clientId: string; clientSecret: string },
) {
  const clientId = client?.clientId ?? getRequiredEnv("GOOGLE_CLIENT_ID");
  const clientSecret = client?.clientSecret ?? getRequiredEnv("GOOGLE_CLIENT_SECRET");

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const text = await res.text();

  if (!res.ok) {
    if (responseIndicatesInvalidGrant(res.status, text)) {
      throw new Error(GMAIL_REAUTH_REQUIRED);
    }
    throw new Error(`Failed to refresh Google token: ${res.status} ${text}`);
  }

  const json = JSON.parse(text) as GoogleTokenResponse;
  return {
    accessToken: json.access_token,
    accessTokenExpiresAt: Date.now() + json.expires_in * 1000,
  };
}
