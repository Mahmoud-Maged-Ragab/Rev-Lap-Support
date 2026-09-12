"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import Logo from "../lib/Revenue Lab 360 Logo_Logo White.png";

/**
 * Public site footer — brand, navigation, legal, and support links, plus a
 * copyright bar. Hidden on /admin and /owner: those areas have their own
 * dense sidebar-driven layout (see admin/layout.tsx) where a full marketing
 * footer would just add scroll length without value. A client component
 * (not the async server root layout) so it can check the current route via
 * usePathname().
 */
export function SiteFooter() {
  const pathname = usePathname();
  const t = useTranslations("footer");

  const isAdminArea = pathname?.startsWith("/admin") || pathname?.startsWith("/owner");
  if (isAdminArea) return null;

  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="w-full px-5 py-10 sm:px-6 sm:py-12 lg:px-12 xl:px-20 2xl:px-32">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <Image src={Logo} alt="" width={32} height={32} className="shrink-0" />
              <span>{t("brandName")}</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-600">
              {t("brandDescription")}
            </p>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("navigationHeading")}
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/" className="text-slate-600 hover:text-ink-900">
                  {t("home")}
                </Link>
              </li>
              <li>
                <Link href="/" className="text-slate-600 hover:text-ink-900">
                  {t("categories")}
                </Link>
              </li>
              <li>
                <Link href="/saved-issues" className="text-slate-600 hover:text-ink-900">
                  {t("savedIssues")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("legalHeading")}
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/terms" className="text-slate-600 hover:text-ink-900">
                  {t("terms")}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-slate-600 hover:text-ink-900">
                  {t("privacy")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("supportHeading")}
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/tutorial" className="text-slate-600 hover:text-ink-900">
                  {t("guide")}
                </Link>
              </li>
            </ul>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-slate-500">
              {t("supportText")}
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>{t("copyright", { year })}</p>
          <p className="text-slate-400">{t("internalUse")}</p>
        </div>
      </div>
    </footer>
  );
}
