import Link from "next/link";
import { readSession } from "@/lib/auth";
import { LogoutButton } from "./LogoutButton";

export const dynamic = "force-dynamic";

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

  const isAdmin = session!.role === "ADMIN";

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr]">
      <aside className="space-y-1 border-r border-slate-200 pr-4 text-sm">
        <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {isAdmin ? "Admin" : "Support"}
        </div>
        {isAdmin ? (
          <NavLink href="/admin/accounts">Account management</NavLink>
        ) : (
          <>
            <NavLink href="/admin/content">Issues</NavLink>
            <NavLink href="/admin/categories">Categories</NavLink>
            <NavLink href="/admin/tags">Tags</NavLink>
          </>
        )}
        <div className="mt-4 border-t border-slate-200 pt-3">
          <div className="px-2 text-xs text-slate-500">Signed in as</div>
          <div className="px-2 text-sm text-ink-900">{session!.email}</div>
          <div className="px-2 pb-2 text-xs text-slate-500">
            Role:
            <span className="font-medium text-ink-900">
              {isAdmin ? "Admin" : "Support"}
            </span>
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
