"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  locales,
  dir,
  LOCALE_COOKIE,
  type Locale,
} from "@/i18n/config";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Header language toggle (EN / العربية). Persists the choice in the NEXT_LOCALE
 * cookie, applies direction immediately for instant feedback, and refreshes the
 * route so server components re-render in the new language on the same URL.
 */
export function LanguageSwitcher() {
  const t = useTranslations("languageSwitcher");
  const active = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function selectLocale(locale: Locale) {
    if (locale === active) return;
    // Persist for SSR on subsequent requests.
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
    // Instant visual feedback before the server round-trip completes.
    document.documentElement.lang = locale;
    document.documentElement.dir = dir(locale);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div
      className="inline-flex items-center overflow-hidden rounded-md border border-slate-200 text-xs"
      role="group"
      aria-label={t("label")}
    >
      {locales.map((locale) => {
        const isActive = locale === active;
        return (
          <button
            key={locale}
            type="button"
            onClick={() => selectLocale(locale)}
            disabled={isPending}
            aria-pressed={isActive}
            className={
              "px-2.5 py-1 transition-colors disabled:opacity-60 " +
              (isActive
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 hover:bg-slate-50")
            }
          >
            {locale === "ar" ? t("arabic") : t("english")}
          </button>
        );
      })}
    </div>
  );
}
