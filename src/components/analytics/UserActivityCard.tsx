import { getLocale, getTranslations } from "next-intl/server";
import { fmtRelative, roleKey } from "@/lib/format";
import type { UserActivity } from "@/lib/history";
import { AvatarChip } from "./HistoryStatsCards";

/**
 * One card per account: avatar, role, created/edited counts, last activity
 * and last touched issues. All data arrives via props.
 */
export async function UserActivityCard({ user }: { user: UserActivity }) {
  const t = await getTranslations("activity");
  const tr = await getTranslations("roles");
  const locale = await getLocale();

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <AvatarChip email={user.email} />
        <div className="min-w-0">
          <div className="truncate font-medium text-ink-900" title={user.email}>
            {user.email}
          </div>
          <div className="text-xs text-slate-500">{tr(roleKey(user.role))}</div>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded bg-slate-50 p-2">
          <dt className="text-xs text-slate-500">{t("issuesCreated")}</dt>
          <dd className="text-lg font-semibold text-ink-900">{user.created}</dd>
        </div>
        <div className="rounded bg-slate-50 p-2">
          <dt className="text-xs text-slate-500">{t("issuesEdited")}</dt>
          <dd className="text-lg font-semibold text-ink-900">{user.edited}</dd>
        </div>
      </dl>

      <dl className="mt-3 space-y-1 text-xs text-slate-600">
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">{t("lastActivity")}</dt>
          <dd>
            {user.lastActivity ? fmtRelative(user.lastActivity, locale) : "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="shrink-0 text-slate-500">{t("lastCreated")}</dt>
          <dd className="truncate" title={user.lastCreated?.title}>
            {user.lastCreated?.title ?? "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="shrink-0 text-slate-500">{t("lastEdited")}</dt>
          <dd className="truncate" title={user.lastEdited?.title}>
            {user.lastEdited?.title ?? "—"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
