import { listIssues } from "@/lib/issues";
import Link from "next/link";
import { AdminIssueRow } from "@/app/admin/AdminIssueRow";

export const dynamic = "force-dynamic";

type SP = { q?: string; sort?: "newest" | "oldest" | "views"; page?: string };

export default async function SupportIssuesPage({ searchParams }: { searchParams: SP }) {
  const page = Number(searchParams.page ?? "1") || 1;
  const pageSize = 25;
  const { items, total } = await listIssues({
    q: searchParams.q,
    sort: searchParams.sort ?? "newest",
    page,
    pageSize,
  });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Issues</h1>
          <p className="text-sm text-slate-500">{total.toLocaleString()} total</p>
        </div>
        <Link href="/admin/issues/new" className="btn btn-primary">
          + New issue
        </Link>
      </div>

      <form className="flex gap-2" action="/admin/content/issues" method="get">
        <input name="q" defaultValue={searchParams.q ?? ""} placeholder="Search issues…" className="input max-w-sm" />
        <select name="sort" defaultValue={searchParams.sort ?? "newest"} className="select max-w-[160px]">
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="views">Most viewed</option>
        </select>
        <button className="btn">Apply</button>
      </form>

      <div className="overflow-hidden rounded-md border border-slate-200">
        <table className="table w-220 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th>Title</th>
              <th className="w-36">Creator</th>
              <th className="w-40">Category</th>
              <th className="w-24">Views</th>
              <th className="w-32">Updated</th>
              <th className="w-32 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-sm text-slate-500">
                  No issues yet. <Link href="/admin/issues/new" className="text-accent hover:underline">Create one.</Link>
                </td>
              </tr>
            )}
            {items.map((i) => (
              <AdminIssueRow key={i.id} issue={i} />
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <div>Page {page} of {totalPages}</div>
          <div className="flex gap-2">
            {page > 1 && <Link className="btn" href={`/admin/content/issues?page=${page - 1}`}>← Previous</Link>}
            {page < totalPages && <Link className="btn" href={`/admin/content/issues?page=${page + 1}`}>Next →</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
