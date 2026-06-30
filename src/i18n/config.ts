/**
 * Locale configuration shared across server and client.
 *
 * The app is localized WITHOUT i18n routing: the active locale is stored in a
 * cookie (not the URL), so switching language keeps the user on the same page.
 * This module is pure (no server-only imports) and safe to import anywhere.
 */

export const locales = ["en", "ar"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/** Cookie that persists the user's language choice. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Type guard: is an arbitrary string one of our supported locales? */
export function isLocale(value: string | undefined | null): value is Locale {
  return value != null && (locales as readonly string[]).includes(value);
}

/** Text direction for a locale. Arabic is right-to-left; everything else LTR. */
export function dir(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}
