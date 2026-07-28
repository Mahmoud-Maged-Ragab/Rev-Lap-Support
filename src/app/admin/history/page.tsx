import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireUserManagement } from "@/lib/guards";
import { listHistory, listHistoryActions } from "@/lib/history";
import { selectAll } from "@/lib/supabase";
import { HistoryFilters } from "@/components/analytics/HistoryFilters";
import { IssueHistoryTable } from "@/components/analytics/IssueHistoryTable";

export const dynamic = "force-dynamic";

type SP = {
  q?: string;
  action?: string;
  admin?: string;
  from?: string;
  to?: string;
  page?: string;
};

/** Rebuild the querystring for pagination links, preserving active filters. */
function pageHref(sp: SP, page: number): string {
  const params = new URLSearchParams();
  for (const k of ["q", "action", "admin", "from", "to"] as const) {
    if (sp[k]) params.set(k, sp[k]!);
  }
  params.set("page", String(page));
  return `/admin/history?${params.toString()}`;
}

export default async function IssueHistoryPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  // OWNER or ADMIN only — SUPPORT and anonymous users are redirected.
  await requireUserManagement();
  const t = await getTranslations("history");

  const page = Math.max(1, Number(searchParams.page ?? "1") || 1);
  const pageSize = 20;

  const [{ items, total }, actions, admins] = await Promise.all([
    listHistory({
      q: searchParams.q,
      action: searchParams.action,
      adminId: searchParams.admin,
      from: searchParams.from,
      to: searchParams.to,
      page,
      pageSize,
    }),
    listHistoryActions(),
    selectAll<{ id: string; email: string }>("admins", {
      select: "id,email",
      order: "email.asc",
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-slate-500">
          {t("subtitle", { count: total })}
        </p>
      </div>

      <HistoryFilters
        actions={actions}
        admins={admins}
        current={{
          q: searchParams.q,
          action: searchParams.action,
          admin: searchParams.admin,
          from: searchParams.from,
          to: searchParams.to,
        }}
      />

      <IssueHistoryTable entries={items} />

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <div>{t("pageOf", { page, total: totalPages })}</div>
          <div className="flex gap-2">
            {page > 1 && (
              <Link className="btn" href={pageHref(searchParams, page - 1)}>
                {t("previous")}
              </Link>
            )}
            {page < totalPages && (
              <Link className="btn" href={pageHref(searchParams, page + 1)}>
                {t("next")}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
