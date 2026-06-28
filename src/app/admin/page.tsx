import Link from "next/link";
import { listIssues } from "@/lib/issues";
import { selectAll } from "@/lib/supabase";
import { AdminIssueRow } from "./AdminIssueRow";

export const dynamic = "force-dynamic";

type SP = { q?: string; sort?: "newest" | "oldest" | "views"; page?: string };

type AccountActivityRow = {
  id: string;
  email: string;
  role: "ADMIN" | "Support";
};

type IssueActivityRow = {
  id: string;
  title: string;
  admin_id: string | null;
  category: { id: string; name: string } | null;
  tags: { tag: { id: string; name: string } | null }[];
};

export default async function AdminIssuesPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const page = Number(searchParams.page ?? "1") || 1;
  const pageSize = 25;
  const [{ items, total }, accounts, issues] = await Promise.all([
    listIssues({
      q: searchParams.q,
      sort: searchParams.sort ?? "newest",
      page,
      pageSize,
    }),
    selectAll<AccountActivityRow>("admins", {
      select: "id,email,role",
      order: "email.asc",
    }),
    selectAll<IssueActivityRow>("issues", {
      select: "id,title,admin_id,category:categories(id,name),tags:issue_tags(tag:tags(id,name))",
      order: "createdAt.desc",
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const accountActivity = accounts.map((account) => {
    const accountIssues = issues.filter((issue) => issue.admin_id === account.id);
    const tags = Array.from(
      new Set(
        accountIssues.flatMap((issue) =>
          (issue.tags ?? [])
            .map((t) => t.tag)
            .filter((t): t is { id: string; name: string } => !!t)
            .map((t) => t.name),
        ),
      ),
    ).sort((a, b) => a.localeCompare(b));
    const categories = Array.from(
      new Set(
        accountIssues
          .map((issue) => issue.category?.name)
          .filter((name): name is string => !!name),
      ),
    ).sort((a, b) => a.localeCompare(b));

    return {
      ...account,
      issues: accountIssues.map((issue) => issue.title),
      tags,
      categories,
    };
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Issues</h1>
          <p className="text-sm text-slate-500">
            {total.toLocaleString()} total
          </p>
        </div>
        <Link href="/admin/issues/new" className="btn btn-primary">
          + New issue
        </Link>
      </div>

      <form className="flex gap-2" action="/admin" method="get">
        <input
          name="q"
          defaultValue={searchParams.q ?? ""}
          placeholder="Search issues…"
          className="input max-w-sm"
        />
        <select
          name="sort"
          defaultValue={searchParams.sort ?? "newest"}
          className="select max-w-[160px]"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="views">Most viewed</option>
        </select>
        <button className="btn">Apply</button>
      </form>

      <div className="rounded-md border border-slate-200 bg-slate-50/60 p-4">
        <h2 className="text-sm font-semibold">Account activity</h2>
        <div className="mt-3 space-y-3">
          {accountActivity.map((account) => (
            <div key={account.id} className="rounded border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-medium text-ink-900">{account.email}</div>
                <span className="chip">{account.role === "ADMIN" ? "Admin" : "Support"}</span>
              </div>
              <div className="mt-2 space-y-1 text-sm text-slate-600">
                <div>
                  <span className="font-medium text-slate-700">Issues:</span>{" "}
                  {account.issues.length > 0 ? account.issues.join(", ") : "None"}
                </div>
                <div>
                  <span className="font-medium text-slate-700">Tags:</span>{" "}
                  {account.tags.length > 0 ? account.tags.join(", ") : "None"}
                </div>
                <div>
                  <span className="font-medium text-slate-700">Categories:</span>{" "}
                  {account.categories.length > 0 ? account.categories.join(", ") : "None"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

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
                <td
                  colSpan={5}
                  className="py-10 text-center text-sm text-slate-500"
                >
                  No issues yet.{" "}
                  <Link
                    href="/admin/issues/new"
                    className="text-accent hover:underline"
                  >
                    Create one.
                  </Link>
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
          <div>
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            {page > 1 && (
              <Link className="btn" href={`/admin?page=${page - 1}`}>
                ← Previous
              </Link>
            )}
            {page < totalPages && (
              <Link className="btn" href={`/admin?page=${page + 1}`}>
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
