import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import Logo from "../lib/Revenue Lab 360 Logo_Logo White.png";
import Image from "next/image";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { readSession } from "@/lib/auth";
import {
  normalizeRole,
  canAccessOwnerPanel,
  canManageUsers,
} from "@/lib/permissions";
import { dir, type Locale } from "@/i18n/config";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MobileNav } from "@/components/MobileNav";
import { SiteFooter } from "@/components/SiteFooter";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const t = await getTranslations("nav");

  const session = await readSession();
  const role = session ? normalizeRole(session.role) : null;
  const showOwnerLink = role ? canAccessOwnerPanel(role) : false;
  // Admin panel link for admins only (owners use the owner panel link).
  const showAdminLink = role ? canManageUsers(role) && !showOwnerLink : false;
  const showSupportLink = role === "SUPPORT";

  const navLinks = [
    { href: "/", label: t("home") },
    { href: "/saved-issues", label: t("savedIssues") },
    ...(showOwnerLink ? [{ href: "/owner", label: t("ownerPanel") }] : []),
    ...(showAdminLink
      ? [{ href: "/admin/accounts", label: t("adminPanel") }]
      : []),
    ...(showSupportLink
      ? [{ href: "/admin/content", label: t("supportPanel") }]
      : []),
  ];

  return (
    <html lang={locale} dir={dir(locale)}>
      <body className="flex min-h-screen flex-col bg-white text-ink-900">
        <NextIntlClientProvider messages={messages}>
          <header className="relative border-b border-slate-200 bg-white">
            <div className="flex h-14 w-full items-center justify-between gap-3 px-5 sm:px-6 lg:px-12 xl:px-20 2xl:px-32">
              <Link
                href="/"
                className="flex min-w-0 items-center gap-2 font-semibold tracking-tight"
              >
                <Image
                  src={Logo}
                  alt="Revenue Lab 360"
                  width={40}
                  height={40}
                  className="shrink-0"
                />
                <span className="truncate">Revenue Lab 360 Support</span>
              </Link>
              <nav className="hidden items-center gap-4 text-sm text-slate-600 md:flex">
                <Link href="/" className="hover:text-ink-900">
                  {t("home")}
                </Link>
                <Link href="/saved-issues" className="hover:text-ink-900">
                  {t("savedIssues")}
                </Link>
                {showOwnerLink ? (
                  <Link href="/owner" className="hover:text-ink-900">
                    {t("ownerPanel")}
                  </Link>
                ) : null}
                {showAdminLink ? (
                  <Link href="/admin/accounts" className="hover:text-ink-900">
                    {t("adminPanel")}
                  </Link>
                ) : null}
                {showSupportLink ? (
                  <Link href="/admin/content" className="hover:text-ink-900">
                    {t("supportPanel")}
                  </Link>
                ) : null}
                <LanguageSwitcher />
              </nav>
              <MobileNav links={navLinks} menuLabel={t("menu")} />
            </div>
          </header>
          <main className="w-full flex-1 px-5 py-6 sm:px-6 sm:py-8 lg:px-12 xl:px-20 2xl:px-32">
            {children}
          </main>
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
