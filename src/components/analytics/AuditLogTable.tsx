import { getLocale, getTranslations } from "next-intl/server";
import { fmtDateTime, fmtRelative } from "@/lib/format";
import type { AuditLogEntry } from "@/lib/audit";

/** Badge tone per action verb (CREATE_* green, DELETE_* red, rest blue). */
function auditBadgeClass(action: string): string {
  if (action.startsWith("CREATE_") || action === "LOGIN" || action === "ENABLE_USER")
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (action.startsWith("DELETE_") || action === "DISABLE_USER")
    return "bg-red-50 text-red-700 border-red-200";
  return "bg-blue-50 text-blue-700 border-blue-200";
}

/** Expandable side-by-side JSON viewer for old/new payloads. */
async function AuditDataViewer({
  oldData,
  newData,
}: {
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
}) {
  const t = await getTranslations("audit");
  if (!oldData && !newData)
    return <span className="text-xs text-slate-400">—</span>;

  return (
    <details>
      <summary className="cursor-pointer select-none text-xs text-accent hover:underline">
        {t("viewData")}
      </summary>
      <div className="mt-2 grid gap-2 lg:grid-cols-2">
        {oldData && (
          <div>
            <div className="mb-1 text-xs font-semibold text-red-700">
              {t("oldData")}
            </div>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded border border-red-200 bg-red-50 p-2 text-xs text-red-900">
              {JSON.stringify(oldData, null, 2)}
            </pre>
          </div>
        )}
        {newData && (
          <div>
            <div className="mb-1 text-xs font-semibold text-emerald-700">
              {t("newData")}
            </div>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-900">
              {JSON.stringify(newData, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </details>
  );
}

/** The audit log table. Rows arrive pre-filtered and pre-paginated. */
export async function AuditLogTable({
  entries,
}: {
  entries: AuditLogEntry[];
}) {
  const t = await getTranslations("audit");
  const locale = await getLocale();

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200">
      <table className="table w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="w-44">{t("colWhen")}</th>
            <th className="w-48">{t("colActor")}</th>
            <th className="w-44">{t("colAction")}</th>
            <th className="w-40">{t("colEntity")}</th>
            <th>{t("colData")}</th>
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
                <div>{fmtRelative(e.createdAt, locale)}</div>
                <time
                  className="text-xs text-slate-400"
                  dateTime={e.createdAt.toISOString()}
                >
                  {fmtDateTime(e.createdAt, locale)}
                </time>
              </td>
              <td>
                <div className="truncate" title={e.actorEmail ?? undefined}>
                  {e.actorEmail ?? t("system")}
                </div>
                {e.ipAddress && (
                  <div className="text-xs text-slate-400">{e.ipAddress}</div>
                )}
              </td>
              <td>
                <span
                  className={`inline-block rounded border px-1.5 py-0.5 text-xs ${auditBadgeClass(e.action)}`}
                >
                  {e.action}
                </span>
              </td>
              <td>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {e.entityType}
                </div>
                <div
                  className="truncate text-xs text-slate-400"
                  title={e.entityId}
                >
                  #{e.entityId}
                </div>
              </td>
              <td>
                <AuditDataViewer oldData={e.oldData} newData={e.newData} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
