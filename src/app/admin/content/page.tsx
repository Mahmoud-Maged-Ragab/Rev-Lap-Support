import { readSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const session = await readSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "SUPPORT") redirect("/admin/accounts");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Content management</h1>
        <p className="text-sm text-slate-500">
          Manage issues, categories, and tags from this section.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/admin/content/issues" className="rounded-md border border-slate-200 bg-white p-4 hover:bg-slate-50">
          <div className="font-medium text-ink-900">Issues</div>
          <div className="mt-1 text-sm text-slate-500">Create and manage support issues.</div>
        </Link>
        <Link href="/admin/categories" className="rounded-md border border-slate-200 bg-white p-4 hover:bg-slate-50">
          <div className="font-medium text-ink-900">Categories</div>
          <div className="mt-1 text-sm text-slate-500">Organize issues by category.</div>
        </Link>
        <Link href="/admin/tags" className="rounded-md border border-slate-200 bg-white p-4 hover:bg-slate-50">
          <div className="font-medium text-ink-900">Tags</div>
          <div className="mt-1 text-sm text-slate-500">Label issues with tags.</div>
        </Link>
      </div>
    </div>
  );
}
