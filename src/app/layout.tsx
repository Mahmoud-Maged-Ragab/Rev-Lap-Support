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
  const tf = await getTranslations("footer");

  const session = await readSession();
  const role = session ? normalizeRole(session.role) : null;
  const showOwnerLink = role ? canAccessOwnerPanel(role) : false;
  // Admin panel link for admins only (owners use the owner panel link).
  const showAdminLink = role ? canManageUsers(role) && !showOwnerLink : false;
  const showSupportLink = role === "SUPPORT";

  return (
    <html lang={locale} dir={dir(locale)}>
      <body className="min-h-screen bg-white text-ink-900">
        <NextIntlClientProvider messages={messages}>
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
              <Link
                href="/"
                className="flex items-center gap-2 font-semibold tracking-tight"
              >
                <Image src={Logo} alt="Revenue Lab 360" width={40} height={40} />{" "}
                <span>Revenue Lab 360 Support</span>
              </Link>
              <nav className="flex items-center gap-4 text-sm text-slate-600">
                <Link href="/" className="hover:text-ink-900">
                  {t("home")}
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
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
          <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
            {tf("text", { year: new Date().getFullYear() })}
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
