import Link from "next/link";
import { requireOwner } from "@/lib/guards";
import { normalizeRole, type Role } from "@/lib/permissions";
import { selectAll, selectRows } from "@/lib/supabase";
import { LogoutButton } from "@/app/admin/LogoutButton";
import { OwnerUserManager } from "./OwnerUserManager";

export const dynamic = "force-dynamic";

type AdminRow = {
  id: string;
  email: string;
  role: string;
  disabled?: boolean | null;
  createdAt: string;
};

async function tableCount(table: string): Promise<number> {
  const { count } = await selectRows(table, { select: "id", limit: 1, count: "exact" });
  return count ?? 0;
}

export default async function OwnerDashboardPage() {
  const session = await requireOwner();

  const [admins, issueCount, categoryCount, tagCount] = await Promise.all([
    selectAll<AdminRow>("admins", {
      select: "id,email,role,disabled,createdAt",
      order: "createdAt.asc",
    }),
    tableCount("issues"),
    tableCount("categories"),
    tableCount("tags"),
  ]);

  const users = admins.map((a) => ({
    id: a.id,
    email: a.email,
    role: normalizeRole(a.role) as Role,
    disabled: !!a.disabled,
    createdAt: new Date(a.createdAt).toISOString(),
  }));

  const roleCounts = users.reduce(
    (acc, u) => {
      acc[u.role] += 1;
      return acc;
    },
    { OWNER: 0, ADMIN: 0, SUPPORT: 0 } as Record<Role, number>,
  );

  const stats: { label: string; value: number }[] = [
    { label: "Owners", value: roleCounts.OWNER },
    { label: "Admins", value: roleCounts.ADMIN },
    { label: "Support", value: roleCounts.SUPPORT },
    { label: "Issues", value: issueCount },
    { label: "Categories", value: categoryCount },
    { label: "Tags", value: tagCount },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Owner dashboard</h1>
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
        <h2 className="text-sm font-semibold text-ink-900">System statistics</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-md border border-slate-200 bg-white p-4"
            >
              <div className="text-2xl font-semibold text-ink-900">{s.value}</div>
              <div className="text-xs uppercase tracking-wide text-slate-500">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* User management */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink-900">User management</h2>
        <OwnerUserManager initial={users} currentAdminId={session.sub} />
      </section>

      {/* Content management */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink-900">Content management</h2>
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
            <div className="mt-1 text-sm text-slate-500">Label issues with tags.</div>
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
