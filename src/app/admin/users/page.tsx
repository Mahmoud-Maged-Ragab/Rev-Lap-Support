import { readSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { selectAll } from "@/lib/supabase";
import { AdminManager } from "./AdminManager";

export const dynamic = "force-dynamic";

type AdminRow = {
  id: string;
  email: string;
  role: "ADMIN" | "Support";
  createdAt: string;
};

export default async function AdminUsersPage() {
  const session = await readSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "ADMIN") redirect("/admin");

  const admins = await selectAll<AdminRow>("admins", {
    select: "id,email,role,createdAt",
    order: "createdAt.asc",
  });

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Admin users</h1>
        <p className="text-sm text-slate-500">
          Manage who can sign in to the admin dashboard.
        </p>
      </div>
      <AdminManager
        currentAdminId={session.sub}
        initial={admins.map((a) => ({
          id: a.id,
          email: a.email,
          role: a.role,
          createdAt: new Date(a.createdAt).toISOString(),
        }))}
      />
    </div>
  );
}
