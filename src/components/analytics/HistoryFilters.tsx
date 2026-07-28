import { getTranslations } from "next-intl/server";

/**
 * GET-form filter bar for the history page. Plain form submission — the
 * server page reads searchParams; no client state.
 */
export async function HistoryFilters({
  actions,
  admins,
  current,
}: {
  actions: string[];
  admins: { id: string; email: string }[];
  current: {
    q?: string;
    action?: string;
    admin?: string;
    from?: string;
    to?: string;
  };
}) {
  const t = await getTranslations("history");
  const th = await getTranslations("history.actions");

  const label = (a: string) =>
    a === "create" || a === "update" || a === "delete" ? th(a) : a;

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      action="/admin/history"
      method="get"
    >
      <div className="min-w-48 flex-1">
        <label className="label" htmlFor="history-q">
          {t("search")}
        </label>
        <input
          id="history-q"
          name="q"
          defaultValue={current.q ?? ""}
          placeholder={t("searchPlaceholder")}
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="history-action">
          {t("colAction")}
        </label>
        <select
          id="history-action"
          name="action"
          defaultValue={current.action ?? ""}
          className="select min-w-32"
        >
          <option value="">{t("allActions")}</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {label(a)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="history-admin">
          {t("colUser")}
        </label>
        <select
          id="history-admin"
          name="admin"
          defaultValue={current.admin ?? ""}
          className="select min-w-40"
        >
          <option value="">{t("allUsers")}</option>
          {admins.map((a) => (
            <option key={a.id} value={a.id}>
              {a.email}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="history-from">
          {t("from")}
        </label>
        <input
          id="history-from"
          type="date"
          name="from"
          defaultValue={current.from ?? ""}
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="history-to">
          {t("to")}
        </label>
        <input
          id="history-to"
          type="date"
          name="to"
          defaultValue={current.to ?? ""}
          className="input"
        />
      </div>
      <button className="btn">{t("apply")}</button>
    </form>
  );
}
