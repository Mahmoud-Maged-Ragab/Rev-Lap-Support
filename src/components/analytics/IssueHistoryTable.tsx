import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { fmtDateTime, fmtRelative } from "@/lib/format";
import type { HistoryEntry } from "@/lib/history";
import { HistoryDiffViewer } from "./HistoryDiffViewer";
import { actionBadgeClass, actionLabelFrom } from "./ActivityTimeline";

/**
 * The full history table: issue, action, actor, timestamps and expandable
 * per-field diff. Rows arrive pre-filtered and pre-paginated.
 */
export async function IssueHistoryTable({
  entries,
}: {
  entries: HistoryEntry[];
}) {
  const t = await getTranslations("history");
  const locale = await getLocale();

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200">
      <table className="table w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th>{t("colIssue")}</th>
            <th className="w-28">{t("colAction")}</th>
            <th className="w-48">{t("colUser")}</th>
            <th className="w-44">{t("colWhen")}</th>
            <th>{t("colChanges")}</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 && (
            <tr>
              <td colSpan={5} className="py-10 text-center text-slate-500">
                {t("empty")}
              </td>
            </tr>
          )}
          {entries.map((e) => (
            <tr key={e.id} className="align-top">
              <td>
                {e.issue ? (
                  <Link
                    href={`/issues/${e.issue.slug}`}
                    className="font-medium text-ink-900 hover:text-accent hover:underline"
                  >
                    {e.issue.title}
                  </Link>
                ) : (
                  <span className="text-slate-400">{t("deletedIssue")}</span>
                )}
                <div className="text-xs text-slate-400">#{e.issueId}</div>
              </td>
              <td>
                <span
                  className={`inline-block rounded border px-1.5 py-0.5 text-xs ${actionBadgeClass(e.action)}`}
                >
                  {actionLabelFrom(t, e.action)}
                </span>
              </td>
              <td>
                {e.admin ? (
                  <>
                    <div className="truncate" title={e.admin.email}>
                      {e.admin.email}
                    </div>
                    <div className="text-xs text-slate-400">{e.admin.role}</div>
                  </>
                ) : (
                  <span className="text-slate-400">{t("unknownUser")}</span>
                )}
              </td>
              <td>
                <div>{fmtRelative(e.createdAt, locale)}</div>
                <time
                  className="text-xs text-slate-400"
                  dateTime={e.createdAt.toISOString()}
                >
                  {fmtDateTime(e.createdAt, locale)}
                </time>
              </td>
              <td>
                <HistoryDiffViewer
                  oldData={e.oldData}
                  newData={e.newData}
                  summary={e.changes !== e.action ? e.changes : null}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
