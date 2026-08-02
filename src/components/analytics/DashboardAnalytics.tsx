import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ActivityStats, HistoryEntry } from "@/lib/history";
import { HistoryStatsCards } from "./HistoryStatsCards";
import { UserActivityCard } from "./UserActivityCard";
import { TopUsersCard } from "./TopUsersCard";
import { ActivityChart } from "./ActivityChart";
import { ActivityTimeline } from "./ActivityTimeline";

/**
 * The full analytics section shared by the Owner and Admin dashboards:
 * overview cards, 30-day chart, top creators/editors, per-user activity
 * cards and the recent-activity timeline. Data arrives via props — the
 * server page fetches once and passes down.
 */
export async function DashboardAnalytics({
  stats,
  recent,
}: {
  stats: ActivityStats;
  recent: HistoryEntry[];
}) {
  const t = await getTranslations("activity");

  return (
    <div className="space-y-6">
      <HistoryStatsCards stats={stats} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActivityChart perDay={stats.perDay} />
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-ink-900">
              {t("recentActivity")}
            </h3>
            <Link
              href="/admin/history"
              className="text-xs text-accent hover:underline"
            >
              {t("viewAll")}
            </Link>
          </div>
          <div className="mt-3 max-h-64 overflow-y-auto">
            <ActivityTimeline entries={recent} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TopUsersCard
          title={t("topCreators")}
          users={stats.topCreators}
          metric="created"
        />
        <TopUsersCard
          title={t("topEditors")}
          users={stats.topEditors}
          metric="edited"
        />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-ink-900">
          {t("userActivity")}
        </h3>
        {stats.users.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            {t("noActivity")}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stats.users.map((u) => (
              <UserActivityCard key={u.id} user={u} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
