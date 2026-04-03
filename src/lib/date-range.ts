/**
 * Budget / Gmail sync date helpers. Keeps presets and parsing in one place
 * so UI presets (e.g. "Last month") stay aligned with API validation.
 */

/** When both Gmail date params are omitted, search this many days including today. */
export const GMAIL_DEFAULT_RANGE_DAYS = 30;

const SLASH_YMD = /^(\d{4})\/(\d{2})\/(\d{2})$/;

export type ParsedSlashDate =
  | { ok: true; slash: string; iso: string }
  | { ok: false; error: string };

/** Validate `YYYY/MM/DD` and return canonical `YYYY-MM-DD` for storage / Gmail math. */
export function parseSlashYmd(input: string): ParsedSlashDate {
  const t = input.trim();
  const m = SLASH_YMD.exec(t);
  if (!m) {
    return { ok: false, error: "Use YYYY/MM/DD (e.g. 2026/01/15)." };
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
    return { ok: false, error: "That calendar date is invalid." };
  }
  const iso = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return { ok: true, slash: t, iso };
}

export function isoToSlashYmd(iso: string): string {
  return iso.replace(/-/g, "/");
}

export function localIsoFromDate(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

/** Calendar arithmetic on `YYYY-MM-DD` (local timezone). */
export function addCalendarDaysIso(iso: string, days: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) throw new Error(`Invalid ISO date: ${iso}`);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  dt.setDate(dt.getDate() + days);
  return localIsoFromDate(dt);
}

/** Inclusive start, inclusive end, as `YYYY-MM-DD` in local calendar. */
export function presetLastDays(dayCount: number, now: Date = new Date()): { startIso: string; endIso: string } {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - (dayCount - 1));
  return { startIso: localIsoFromDate(start), endIso: localIsoFromDate(end) };
}

/** Previous calendar month (local), inclusive. */
export function presetLastMonth(now: Date = new Date()): { startIso: string; endIso: string } {
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  return { startIso: localIsoFromDate(start), endIso: localIsoFromDate(end) };
}

export type ResolvedGmailRange =
  | { ok: true; startIso: string; endIso: string }
  | { ok: false; error: string };

/**
 * Gmail preview: both params blank → last 30 days; otherwise both must be valid `YYYY/MM/DD`.
 */
export function resolveGmailRangeFromParams(
  startRaw: string | null | undefined,
  endRaw: string | null | undefined,
): ResolvedGmailRange {
  const s = startRaw?.trim() ?? "";
  const e = endRaw?.trim() ?? "";

  if (!s && !e) {
    const { startIso, endIso } = presetLastDays(GMAIL_DEFAULT_RANGE_DAYS);
    return { ok: true, startIso, endIso };
  }

  if (!s || !e) {
    return {
      ok: false,
      error:
        `Enter both start_date and end_date as YYYY/MM/DD, or leave both blank for the last ${GMAIL_DEFAULT_RANGE_DAYS} days.`,
    };
  }

  const ps = parseSlashYmd(s);
  if (!ps.ok) return { ok: false, error: `start_date: ${ps.error}` };

  const pe = parseSlashYmd(e);
  if (!pe.ok) return { ok: false, error: `end_date: ${pe.error}` };

  if (ps.iso > pe.iso) {
    return { ok: false, error: "start_date must be on or before end_date." };
  }

  return { ok: true, startIso: ps.iso, endIso: pe.iso };
}

/** `YYYY-MM-DD` → `YYYY/MM/DD` for Gmail `after:` / `before:` operators. */
export function isoToGmailSlashDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) throw new Error(`Invalid date (expected YYYY-MM-DD): ${iso}`);
  return `${m[1]}/${m[2]}/${m[3]}`;
}
