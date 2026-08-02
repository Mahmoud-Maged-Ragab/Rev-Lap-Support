import { getTranslations } from "next-intl/server";
import { initials, roleKey } from "@/lib/format";
import type { ActivityStats } from "@/lib/history";

/**
 * Overview cards for the analytics section: today's counts and the most
 * active accounts. Pure presentation — all numbers arrive via props.
 */
export async function HistoryStatsCards({ stats }: { stats: ActivityStats }) {
  const t = await getTranslations("activity");
  const tr = await getTranslations("roles");

  const cards: {
    label: string;
    value: string;
    sub?: string;
  }[] = [
    { label: t("createdToday"), value: String(stats.createdToday) },
    { label: t("updatedToday"), value: String(stats.updatedToday) },
    {
      label: t("mostActiveUser"),
      value: stats.mostActiveUser?.email ?? "—",
      sub: stats.mostActiveUser
        ? `${tr(roleKey(stats.mostActiveUser.role))} · ${
            stats.mostActiveUser.created + stats.mostActiveUser.edited
          } ${t("actions")}`
        : undefined,
    },
    {
      label: t("mostActiveAdmin"),
      value: stats.mostActiveAdmin?.email ?? "—",
      sub: stats.mostActiveAdmin
        ? `${tr(roleKey(stats.mostActiveAdmin.role))} · ${
            stats.mostActiveAdmin.created + stats.mostActiveAdmin.edited
          } ${t("actions")}`
        : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-md border border-slate-200 bg-white p-4"
        >
          <div className="truncate text-xl font-semibold text-ink-900" title={c.value}>
            {c.value}
          </div>
          <div className="text-xs uppercase tracking-wide text-slate-500">
            {c.label}
          </div>
          {c.sub && <div className="mt-1 text-xs text-slate-500">{c.sub}</div>}
        </div>
      ))}
    </div>
  );
}

/** Small round avatar with account initials (no user images exist). */
export function AvatarChip({ email }: { email: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
      {initials(email)}
    </span>
  );
}
