/**
 * Minimal timezone math for the clinic zone (DST-safe, no dependencies).
 * Appointments are stored in UTC; the schedule grid lives in clinic time.
 */
import { CLINIC_TZ } from "./constants";

/** Offset (ms) of `tz` relative to UTC at the given instant. */
function tzOffsetMs(tz: string, at: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(at)) parts[p.type] = p.value;
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - at.getTime();
}

/** UTC instant for `minutes` past midnight of `YYYY-MM-DD` in clinic time. */
export function clinicTimeToUtc(dateStr: string, minutes: number): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const naive = Date.UTC(y, m - 1, d, 0, 0) + minutes * 60_000;
  // two-pass fix-up handles DST boundaries
  let guess = new Date(naive - tzOffsetMs(CLINIC_TZ, new Date(naive)));
  guess = new Date(naive - tzOffsetMs(CLINIC_TZ, guess));
  return guess;
}

/** Weekday (0=Sunday…6=Saturday) of `YYYY-MM-DD` in clinic time. */
export function clinicWeekday(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay(); // noon avoids edge cases
}

/** `YYYY-MM-DD` of an instant, in clinic time. */
export function clinicDateStr(at: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CLINIC_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** "6:30 PM" style label of an instant, in clinic time. */
export function clinicTimeLabel(at: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CLINIC_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(at);
}

export function clinicDateTimeLabel(at: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: CLINIC_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(at);
}
