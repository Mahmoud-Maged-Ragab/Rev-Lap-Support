import { getTranslations } from "next-intl/server";

/**
 * Expandable field-by-field diff for a history entry. Old values in red,
 * new values in green. Server-rendered; expansion is a native <details>.
 */
export async function HistoryDiffViewer({
  oldData,
  newData,
  summary,
}: {
  oldData: Record<string, string | null> | null;
  newData: Record<string, string | null> | null;
  summary: string | null;
}) {
  const t = await getTranslations("history");

  const fields = Array.from(
    new Set([...Object.keys(oldData ?? {}), ...Object.keys(newData ?? {})]),
  );
  if (fields.length === 0) {
    return summary ? (
      <span className="text-xs text-slate-500">{summary}</span>
    ) : (
      <span className="text-xs text-slate-400">—</span>
    );
  }

  return (
    <details className="group">
      <summary className="cursor-pointer select-none text-xs text-accent hover:underline">
        {t("changedFields", { count: fields.length })}
        <span className="ms-1 text-slate-400">{summary}</span>
      </summary>
      <dl className="mt-2 space-y-2 rounded border border-slate-200 bg-slate-50/60 p-3">
        {fields.map((f) => {
          const oldV = oldData?.[f] ?? null;
          const newV = newData?.[f] ?? null;
          return (
            <div key={f}>
              <dt className="text-xs font-semibold capitalize text-slate-600">
                {f}
              </dt>
              <dd className="mt-0.5 space-y-0.5 text-xs">
                {oldV !== null && (
                  <div className="break-words rounded bg-red-50 px-2 py-1 text-red-700">
                    <span className="me-1 select-none font-semibold">−</span>
                    {oldV}
                  </div>
                )}
                {newV !== null && (
                  <div className="break-words rounded bg-emerald-50 px-2 py-1 text-emerald-700">
                    <span className="me-1 select-none font-semibold">+</span>
                    {newV}
                  </div>
                )}
                {oldV === null && newV === null && (
                  <div className="text-slate-400">—</div>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </details>
  );
}
