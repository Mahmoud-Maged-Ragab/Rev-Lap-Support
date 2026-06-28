import { readSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminAccountsPage() {
  const session = await readSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "ADMIN") redirect("/admin/content");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Account management</h1>
        <p className="text-sm text-slate-500">
          Admins can create and manage user accounts and roles here.
        </p>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600">
          Use this area to manage who can access the system.
        </p>
        <div className="mt-4">
          <Link href="/admin/users" className="btn btn-primary">
            Open account list
          </Link>
        </div>
      </div>
    </div>
  );
}
