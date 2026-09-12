import { listIssues } from "@/lib/issues";
import { selectAll } from "@/lib/supabase";
import { SearchBar } from "@/components/SearchBar";
import { FilterBar } from "@/components/FilterBar";
import { IssueList } from "@/components/IssueList";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  category?: string;
  tags?: string;
  sort?: "newest" | "oldest" | "views";
  page?: string;
};

type CategoryWithCount = {
  id: string;
  name: string;
  issues: { count: number }[];
};

type TagRow = { id: string; name: string };

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const page = Number(searchParams.page ?? "1") || 1;
  const pageSize = 15;
  const tagIds = searchParams.tags
    ? searchParams.tags.split(",").filter(Boolean)
    : [];

  const [{ items, total }, categoriesRaw, tags] = await Promise.all([
    listIssues({
      q: searchParams.q,
      categoryId: searchParams.category,
      tagIds,
      sort: searchParams.sort ?? "newest",
      page,
      pageSize,
    }),
    selectAll<CategoryWithCount>("categories", {
      select: "id,name,issues(count)",
      order: "name.asc",
    }),
    // No limit: the tag selector filters/searches client-side, so it needs
    // the full list to search against.
    selectAll<TagRow>("tags", {
      select: "id,name",
      order: "name.asc",
    }),
  ]);

  const categories = categoriesRaw.map((c) => ({
    id: c.id,
    name: c.name,
    _count: c.issues?.[0]?.count ?? 0,
  }));

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const qs = new URLSearchParams(
    Object.entries(searchParams).filter(([, v]) => v) as [string, string][],
  );

  const t = await getTranslations("home");
  const tf = await getTranslations("filters");
  const hasActiveFilters = Boolean(
    searchParams.q || searchParams.category || tagIds.length > 0,
  );

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-slate-600">{t("subtitle")}</p>
        <div className="mt-4 max-w-2xl">
          <SearchBar />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr] md:gap-8">
        <FilterBar categories={categories} tags={tags} />

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <div>
              {t("results", { count: total })}
              {searchParams.q ? (
                <> {t("searchedFor", { query: searchParams.q })}</>
              ) : null}
            </div>
            {hasActiveFilters && (
              <Link href="/" className="font-medium text-accent hover:underline">
                {tf("clearAll")}
              </Link>
            )}
          </div>

          <IssueList items={items} />

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 text-sm">
              <div className="text-slate-500">
                {t("pageOf", { page, total: totalPages })}
              </div>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    className="btn"
                    href={`/?${new URLSearchParams({ ...Object.fromEntries(qs), page: String(page - 1) }).toString()}`}
                  >
                    {t("previous")}
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    className="btn"
                    href={`/?${new URLSearchParams({ ...Object.fromEntries(qs), page: String(page + 1) }).toString()}`}
                  >
                    {t("next")}
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
