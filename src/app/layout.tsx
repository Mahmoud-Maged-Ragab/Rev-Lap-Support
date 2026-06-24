import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import Logo from "../lib/Revenue Lab 360 Logo_Logo White.png";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Revenue Lab 360 Support",
  description:
    "Searchable internal documentation for issues, fixes, and solutions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-ink-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold tracking-tight"
            >
              <Image src={Logo} alt="Logo" width={40} height={40} />{" "}
              <span>Revenue Lab 360 Support</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm text-slate-600">
              <Link href="/" className="hover:text-ink-900">
                Home
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
          Internal use. © {new Date().getFullYear()} Revenue Lab 360. All rights
          reserved.
        </footer>
      </body>
    </html>
  );
}
