import { getTranslations } from "next-intl/server";
import type { DashboardStatsData } from "@/lib/stats";

/**
 * Shared statistics cards used by both the Owner and Admin dashboards.
 * Pure presentation — all counts arrive via `data` (see `getDashboardStats`);
 * nothing is fetched or hardcoded here.
 */
export async function DashboardStats({ data }: { data: DashboardStatsData }) {
  const t = await getTranslations("owner");
  const tIssues = await getTranslations("issuesTable");

  const cards: { label: string; value: number }[] = [
    { label: tIssues("statTotalUsers"), value: data.totalUsers },
    { label: t("statOwners"), value: data.roleCounts.OWNER },
    { label: t("statAdmins"), value: data.roleCounts.ADMIN },
    { label: t("statSupport"), value: data.roleCounts.SUPPORT },
    { label: t("statIssues"), value: data.issues },
    { label: t("statCategories"), value: data.categories },
    { label: t("statTags"), value: data.tags },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-md border border-slate-200 bg-white p-4"
        >
          <div className="text-2xl font-semibold text-ink-900">{c.value}</div>
          <div className="text-xs uppercase tracking-wide text-slate-500">
            {c.label}
          </div>
        </div>
      ))}
    </div>
  );
}
