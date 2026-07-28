import { getTranslations } from "next-intl/server";
import type { UserActivity } from "@/lib/history";
import { AvatarChip } from "./HistoryStatsCards";

/**
 * Ranked "top accounts" list (Top creators / Top editors). The bar length is
 * proportional to the leader — magnitude comparison, one hue (sequential).
 */
export async function TopUsersCard({
  title,
  users,
  metric,
}: {
  title: string;
  users: UserActivity[];
  metric: "created" | "edited";
}) {
  const t = await getTranslations("activity");
  const max = Math.max(1, ...users.map((u) => u[metric]));

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
      {users.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">
          {t("noActivity")}
        </p>
      ) : (
        <ol className="mt-3 space-y-2">
          {users.map((u) => (
            <li key={u.id} className="flex items-center gap-3">
              <AvatarChip email={u.email} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className="truncate text-sm font-medium text-ink-900"
                    title={u.email}
                  >
                    {u.email}
                  </span>
                  <span className="text-sm font-semibold text-ink-900">
                    {u[metric]}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded bg-slate-100">
                  <div
                    className="h-full rounded bg-accent"
                    style={{ width: `${Math.round((u[metric] / max) * 100)}%` }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
