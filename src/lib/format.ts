/**
 * Locale-aware date/number formatting for server-rendered analytics.
 * Kept out of components so timeline/table/cards all format identically.
 */

import type { Role } from "./permissions";
import { normalizeRole } from "./permissions";

/** Translation key in the `roles` namespace for a role value. */
export function roleKey(role: unknown): "owner" | "admin" | "support" {
  const r: Role = normalizeRole(role);
  if (r === "OWNER") return "owner";
  if (r === "ADMIN") return "admin";
  return "support";
}

/** "Jul 18, 2026, 14:05" — exact datetime, locale-aware. */
export function fmtDateTime(d: Date, locale: string): string {
  return d.toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "Jul 18" — short day label for chart axes. */
export function fmtDay(d: Date, locale: string): string {
  return d.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

/** "2 minutes ago" — relative time, locale-aware, server-rendered. */
export function fmtRelative(d: Date, locale: string, now = new Date()): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const diffSec = Math.round((d.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(diffSec, "second");
  if (abs < 3600) return rtf.format(Math.trunc(diffSec / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.trunc(diffSec / 3600), "hour");
  if (abs < 30 * 86_400) return rtf.format(Math.trunc(diffSec / 86_400), "day");
  if (abs < 365 * 86_400)
    return rtf.format(Math.trunc(diffSec / (30 * 86_400)), "month");
  return rtf.format(Math.trunc(diffSec / (365 * 86_400)), "year");
}

/** Uppercase initials for an avatar, e.g. "ahmed@x.com" → "AH". */
export function initials(email: string): string {
  const name = email.split("@")[0] ?? "";
  return name.slice(0, 2).toUpperCase() || "?";
}
