import Link from "next/link";
import type { IssueListItem } from "@/lib/issues";

function fmt(d: Date) {
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function IssueList({ items }: { items: IssueListItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
        No issues match your filters.
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
                  {/* {i.creator ? (
                    <span className="chip">Created by {i.creator.email}</span>
                  ) : null} */}
                </div>
              </div>
              <div className="shrink-0 text-right text-xs text-slate-500">
                <span className="ml-1">Updated {fmt(i.updatedAt)}</span>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
