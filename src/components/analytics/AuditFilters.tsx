import { getTranslations } from "next-intl/server";

/**
 * GET-form filter bar for the audit logs page. Plain form submission — the
 * server page reads searchParams; no client state.
 */
export async function AuditFilters({
  entityTypes,
  actions,
  actors,
  current,
}: {
  entityTypes: string[];
  actions: string[];
  actors: { id: string; email: string }[];
  current: {
    q?: string;
    entity?: string;
    action?: string;
    actor?: string;
    from?: string;
    to?: string;
  };
}) {
  const t = await getTranslations("audit");

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      action="/admin/audit-logs"
      method="get"
    >
      <div className="min-w-48 flex-1">
        <label className="label" htmlFor="audit-q">
          {t("search")}
        </label>
        <input
          id="audit-q"
          name="q"
          defaultValue={current.q ?? ""}
          placeholder={t("searchPlaceholder")}
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="audit-entity">
          {t("colEntity")}
        </label>
        <select
          id="audit-entity"
          name="entity"
          defaultValue={current.entity ?? ""}
          className="select min-w-32"
        >
          <option value="">{t("allEntities")}</option>
          {entityTypes.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="audit-action">
          {t("colAction")}
        </label>
        <select
          id="audit-action"
          name="action"
          defaultValue={current.action ?? ""}
          className="select min-w-40"
        >
          <option value="">{t("allActions")}</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="audit-actor">
          {t("colActor")}
        </label>
        <select
          id="audit-actor"
          name="actor"
          defaultValue={current.actor ?? ""}
          className="select min-w-40"
        >
          <option value="">{t("allActors")}</option>
          {actors.map((a) => (
            <option key={a.id} value={a.id}>
              {a.email}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="audit-from">
          {t("from")}
        </label>
        <input
          id="audit-from"
          type="date"
          name="from"
          defaultValue={current.from ?? ""}
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="audit-to">
          {t("to")}
        </label>
        <input
          id="audit-to"
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
