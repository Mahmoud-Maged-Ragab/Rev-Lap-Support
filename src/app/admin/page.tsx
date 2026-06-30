import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { listIssues } from "@/lib/issues";
import { selectAll } from "@/lib/supabase";
import { requireContentAccess } from "@/lib/guards";
import { normalizeRole } from "@/lib/permissions";
import { AdminIssueRow } from "./AdminIssueRow";

export const dynamic = "force-dynamic";

function roleKey(role: string): "owner" | "admin" | "support" {
  const r = normalizeRole(role);
  if (r === "OWNER") return "owner";
  if (r === "ADMIN") return "admin";
  return "support";
}

type SP = { q?: string; sort?: "newest" | "oldest" | "views"; page?: string };

type AccountActivityRow = {
  id: string;
  email: string;
  role: string;
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
  await requireContentAccess();
  const t = await getTranslations("issuesTable");
  const tr = await getTranslations("roles");

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
          <h1 className="text-lg font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-slate-500">
            {t("totalCount", { count: total })}
          </p>
        </div>
        <Link href="/admin/issues/new" className="btn btn-primary">
          {t("newIssue")}
        </Link>
      </div>

      <form className="flex gap-2" action="/admin" method="get">
        <input
          name="q"
          defaultValue={searchParams.q ?? ""}
          placeholder={t("searchPlaceholder")}
          className="input max-w-sm"
        />
        <select
          name="sort"
          defaultValue={searchParams.sort ?? "newest"}
          className="select max-w-[160px]"
        >
          <option value="newest">{t("sortNewest")}</option>
          <option value="oldest">{t("sortOldest")}</option>
          <option value="views">{t("sortViews")}</option>
        </select>
        <button className="btn">{t("apply")}</button>
      </form>

      <div className="rounded-md border border-slate-200 bg-slate-50/60 p-4">
        <h2 className="text-sm font-semibold">{t("accountActivity")}</h2>
        <div className="mt-3 space-y-3">
          {accountActivity.map((account) => (
            <div key={account.id} className="rounded border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-medium text-ink-900">{account.email}</div>
                <span className="chip">{tr(roleKey(account.role))}</span>
              </div>
              <div className="mt-2 space-y-1 text-sm text-slate-600">
                <div>
                  <span className="font-medium text-slate-700">{t("issuesLabel")}</span>{" "}
                  {account.issues.length > 0 ? account.issues.join(", ") : t("none")}
                </div>
                <div>
                  <span className="font-medium text-slate-700">{t("tagsLabel")}</span>{" "}
                  {account.tags.length > 0 ? account.tags.join(", ") : t("none")}
                </div>
                <div>
                  <span className="font-medium text-slate-700">{t("categoriesLabel")}</span>{" "}
                  {account.categories.length > 0 ? account.categories.join(", ") : t("none")}
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
              <th>{t("colTitle")}</th>
              <th className="w-36">{t("colCreator")}</th>
              <th className="w-40">{t("colCategory")}</th>
              <th className="w-24">{t("colViews")}</th>
              <th className="w-32">{t("colUpdated")}</th>
              <th className="w-32 text-end">{t("colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="py-10 text-center text-sm text-slate-500"
                >
                  {t("emptyNoIssues")}{" "}
                  <Link
                    href="/admin/issues/new"
                    className="text-accent hover:underline"
                  >
                    {t("createOne")}
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
