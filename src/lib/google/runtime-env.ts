/** Vercel / production: never read gitignored JSON from disk (avoids crashes). */
export function allowGmailDiskFiles(): boolean {
  if (process.env.VERCEL === "1") return false;
  if (process.env.NODE_ENV === "production") return false;
  return true;
}
