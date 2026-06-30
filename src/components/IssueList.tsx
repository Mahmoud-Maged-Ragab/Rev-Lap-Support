import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { IssueListItem } from "@/lib/issues";

function fmt(d: Date, locale: string) {
  return new Date(d).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export async function IssueList({ items }: { items: IssueListItem[] }) {
  const t = await getTranslations("issueList");
  const locale = await getLocale();

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
        {t("empty")}
      </div>
    );
  }
  return (
    <ul className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
      {items.map((i) => (
        <li key={i.id} className="p-4 transition-colors hover:bg-slate-50">
          <Link href={`/issues/${i.slug}`} className="block">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="truncate text-[15px] font-semibold text-ink-900">{i.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{i.description}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                  {i.category && <span className="chip">{i.category.name}</span>}
                  {i.tags.slice(0, 4).map((t) => (
                    <span key={t.id} className="chip">{t.name}</span>
                  ))}
                </div>
              </div>
              <div className="shrink-0 text-end text-xs text-slate-500">
                <span className="ms-1">{t("updated", { date: fmt(i.updatedAt, locale) })}</span>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
