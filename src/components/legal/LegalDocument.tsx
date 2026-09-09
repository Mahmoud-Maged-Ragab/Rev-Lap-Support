import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { LegalSection } from "@/lib/legalContent";

/**
 * Shared chrome for /terms and /privacy: back link, title + last-updated,
 * a table of contents, and numbered sections with anchor ids. The body
 * copy in lib/legalContent.ts is English-only (legal text isn't
 * machine-translated), so this renders `dir="ltr"` regardless of the
 * active site locale — everything around it (header, footer, nav) still
 * follows the user's chosen language/direction.
 */
export async function LegalDocument({
  title,
  lastUpdated,
  sections,
}: {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
}) {
  const t = await getTranslations("legal");

  return (
    <div dir="ltr" className="mx-auto max-w-3xl">
      <Link href="/" className="text-xs text-slate-500 hover:text-ink-900">
        {t("backToHome")}
      </Link>

      <header className="mt-3 border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {t("lastUpdated")}: {lastUpdated}
        </p>
      </header>

      <nav
        aria-label={t("tableOfContents")}
        className="card mt-6 p-4 sm:p-5"
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("tableOfContents")}
        </h2>
        <ol className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
          {sections.map((s, i) => (
            <li key={s.id} className="min-w-0">
              <a
                href={`#${s.id}`}
                className="block truncate text-accent hover:underline"
              >
                {i + 1}. {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <article className="prose-kb mt-8 space-y-10">
        {sections.map((s, i) => (
          <section
            key={s.id}
            id={s.id}
            className="scroll-mt-20 space-y-3 border-t border-slate-200 pt-8 first:border-t-0 first:pt-0"
          >
            <h2 className="text-lg font-semibold text-ink-900">
              {i + 1}. {s.title}
            </h2>
            {s.body.map((paragraph, pi) => (
              <p key={pi} className="text-[15px] leading-relaxed text-slate-700">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </article>

      <div className="mt-10 border-t border-slate-200 pt-6 text-sm">
        <Link href="/" className="text-accent hover:underline">
          {t("backToHome")}
        </Link>
      </div>
    </div>
  );
}
