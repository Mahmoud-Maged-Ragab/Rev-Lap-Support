import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireOwner } from "@/lib/guards";
import { normalizeRole, type Role } from "@/lib/permissions";
import { selectAll } from "@/lib/supabase";
import { getDashboardStats } from "@/lib/stats";
import { getActivityStats, listRecentActivity } from "@/lib/history";
import { LogoutButton } from "@/app/admin/LogoutButton";
import { UserManager } from "@/components/UserManager";
import { DashboardStats } from "@/components/DashboardStats";
import { DashboardAnalytics } from "@/components/analytics/DashboardAnalytics";

export const dynamic = "force-dynamic";

type AdminRow = {
  id: string;
  email: string;
  role: string;
  disabled?: boolean | null;
  createdAt: string;
};

export default async function OwnerDashboardPage() {
  const session = await requireOwner();
  const tActivity = await getTranslations("activity");

  const admins = await selectAll<AdminRow>("admins", {
    select: "id,email,role,disabled,createdAt",
    order: "createdAt.asc",
  });
  const [stats, activity, recent] = await Promise.all([
    getDashboardStats(admins),
    getActivityStats(admins),
    listRecentActivity(8),
  ]);

  const users = admins.map((a) => ({
    id: a.id,
    email: a.email,
    role: normalizeRole(a.role) as Role,
    disabled: !!a.disabled,
    createdAt: new Date(a.createdAt).toISOString(),
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            Owner dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Full control over users, content, and system settings.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Signed in as <span className="text-ink-900">{session.email}</span>
          </p>
        </div>
        <div className="w-28">
          <LogoutButton />
        </div>
      </div>

      {/* Statistics */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink-900">
          System statistics
        </h2>
        <DashboardStats data={stats} />
      </section>

      {/* User activity analytics */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink-900">
          {tActivity("sectionTitle")}
        </h2>
        <DashboardAnalytics stats={activity} recent={recent} />
      </section>

      {/* User management */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink-900">User management</h2>
        <UserManager
          initial={users}
          currentAdminId={session.sub}
          actorRole={normalizeRole(session.role)}
        />
      </section>

      {/* Content management */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink-900">
          Content management
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/admin/content/issues"
            className="rounded-md border border-slate-200 bg-white p-4 hover:bg-slate-50"
          >
            <div className="font-medium text-ink-900">Issues</div>
            <div className="mt-1 text-sm text-slate-500">
              Create and manage support issues.
            </div>
          </Link>
          <Link
            href="/admin/categories"
            className="rounded-md border border-slate-200 bg-white p-4 hover:bg-slate-50"
          >
            <div className="font-medium text-ink-900">Categories</div>
            <div className="mt-1 text-sm text-slate-500">
              Organize issues by category.
            </div>
          </Link>
          <Link
            href="/admin/tags"
            className="rounded-md border border-slate-200 bg-white p-4 hover:bg-slate-50"
          >
            <div className="font-medium text-ink-900">Tags</div>
            <div className="mt-1 text-sm text-slate-500">
              Label issues with tags.
            </div>
          </Link>
        </div>
      </section>

      {/* System controls */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink-900">System controls</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href="/admin/accounts"
            className="rounded-md border border-slate-200 bg-white p-4 hover:bg-slate-50"
          >
            <div className="font-medium text-ink-900">Admin account area</div>
            <div className="mt-1 text-sm text-slate-500">
              Everything an admin can access.
            </div>
          </Link>
          <Link
            href="/"
            className="rounded-md border border-slate-200 bg-white p-4 hover:bg-slate-50"
          >
            <div className="font-medium text-ink-900">Public site</div>
            <div className="mt-1 text-sm text-slate-500">
              View the knowledge base as visitors see it.
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
