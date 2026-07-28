import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { fmtDateTime, fmtRelative } from "@/lib/format";
import type { HistoryEntry } from "@/lib/history";

/** Badge color per action; unknown actions get the neutral style. */
export function actionBadgeClass(action: string): string {
  switch (action) {
    case "create":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "update":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "delete":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
}

/** Translated label for an action, given the `history` translator. */
export function actionLabelFrom(
  t: (key: string) => string,
  action: string,
): string {
  switch (action) {
    case "create":
      return t("actionCreate");
    case "update":
      return t("actionUpdate");
    case "delete":
      return t("actionDelete");
    default:
      return action;
  }
}

/**
 * Vertical activity feed, newest first: time, actor, action, issue link and
 * a one-line change summary.
 */
export async function ActivityTimeline({
  entries,
}: {
  entries: HistoryEntry[];
}) {
  const t = await getTranslations("history");
  const locale = await getLocale();

  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">{t("empty")}</p>
    );
  }

  return (
    <ol className="relative space-y-4 border-s border-slate-200 ps-4">
      {entries.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -start-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent" />
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
            <time
              className="text-xs tabular-nums text-slate-500"
              dateTime={e.createdAt.toISOString()}
              title={fmtDateTime(e.createdAt, locale)}
            >
              {fmtRelative(e.createdAt, locale)}
            </time>
            <span className="font-medium text-ink-900">
              {e.admin?.email ?? t("unknownUser")}
            </span>
            <span
              className={`rounded border px-1.5 py-0.5 text-xs ${actionBadgeClass(e.action)}`}
            >
              {actionLabelFrom(t, e.action)}
            </span>
            {e.issue ? (
              <Link
                href={`/issues/${e.issue.slug}`}
                className="truncate text-accent hover:underline"
                title={e.issue.title}
              >
                {e.issue.title}
              </Link>
            ) : (
              <span className="text-slate-400">{t("deletedIssue")}</span>
            )}
          </div>
          {e.changes && e.changes !== e.action && (
            <div className="mt-0.5 text-xs text-slate-500">
              {t("changed")} {e.changes}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
