import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { readSession } from "@/lib/auth";
import {
  normalizeRole,
  canAccessOwnerPanel,
  canManageUsers,
  canManageContent,
  type Role,
} from "@/lib/permissions";
import { LogoutButton } from "./LogoutButton";

export const dynamic = "force-dynamic";

/** Maps a canonical role to its translation key in the `roles` namespace. */
function roleKey(role: Role): "owner" | "admin" | "support" {
  if (role === "OWNER") return "owner";
  if (role === "ADMIN") return "admin";
  return "support";
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await readSession();
  const showShell = !!session;

  if (!showShell) {
    // Login page renders its own minimal shell.
    return <>{children}</>;
  }

  const role = normalizeRole(session!.role);
  const t = await getTranslations("adminNav");
  const tr = await getTranslations("roles");
  const label = tr(roleKey(role));

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr]">
      <aside className="space-y-1 border-e border-slate-200 pe-4 text-sm">
        <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </div>
        {canAccessOwnerPanel(role) && (
          <NavLink href="/owner">{t("ownerDashboard")}</NavLink>
        )}
        {canManageUsers(role) && (
          <NavLink href="/admin/accounts">{t("accountManagement")}</NavLink>
        )}
        {canManageContent(role) && (
          <>
            <NavLink href="/admin/content">{t("issues")}</NavLink>
            <NavLink href="/admin/categories">{t("categories")}</NavLink>
            <NavLink href="/admin/tags">{t("tags")}</NavLink>
          </>
        )}
        <div className="mt-4 border-t border-slate-200 pt-3">
          <div className="px-2 text-xs text-slate-500">{t("signedInAs")}</div>
          <div className="px-2 text-sm text-ink-900">{session!.email}</div>
          <div className="px-2 pb-2 text-xs text-slate-500">
            {t("role")}{" "}
            <span className="font-medium text-ink-900">{label}</span>
          </div>
          <LogoutButton />
        </div>
      </aside>
      <section>{children}</section>
    </div>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="block rounded px-2 py-1.5 text-slate-700 hover:bg-slate-100 hover:text-ink-900"
    >
      {children}
    </Link>
  );
}
