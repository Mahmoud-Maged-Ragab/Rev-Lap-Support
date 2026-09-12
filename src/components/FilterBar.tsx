"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown";

type Item = { id: string; name: string; _count?: number };

export function FilterBar({
  categories,
  tags,
}: {
  categories: Item[];
  tags: Item[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const t = useTranslations("filters");

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    next.delete("page");
    router.push(`/?${next.toString()}`);
  }

  const cat = params.get("category") ?? "";
  const tagsParam = params.get("tags") ?? "";
  const selectedTagIds = useMemo(
    () => new Set(tagsParam.split(",").filter(Boolean)),
    [tagsParam],
  );

  function setTags(next: Set<string>) {
    setParam("tags", next.size > 0 ? Array.from(next).join(",") : null);
  }

  return (
    <aside className="space-y-4 md:space-y-6">
      {/* Mobile / narrow layout: compact select instead of a tall list. */}
      <div className="md:hidden">
        <label htmlFor="filter-category-mobile" className="sr-only">
          {t("categories")}
        </label>
        <select
          id="filter-category-mobile"
          className="select"
          value={cat}
          onChange={(e) => setParam("category", e.target.value || null)}
        >
          <option value="">{t("allCategories")}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {typeof c._count === "number" ? ` (${c._count})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop / wide layout: unchanged category list. */}
      <div className="hidden md:block">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("categories")}
        </div>
        <ul className="space-y-1 text-sm">
          <li>
            <button
              onClick={() => setParam("category", null)}
              className={
                "w-full rounded px-2 py-1 text-start hover:bg-slate-50 " +
                (!cat ? "font-medium text-ink-900" : "text-slate-700")
              }
            >
              {t("allCategories")}
            </button>
          </li>
          {categories.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => setParam("category", c.id)}
                className={
                  "flex w-full items-center justify-between rounded px-2 py-1 text-start hover:bg-slate-50 " +
                  (cat === c.id ? "font-medium text-ink-900" : "text-slate-700")
                }
              >
                <span>{c.name}</span>
                {typeof c._count === "number" && (
                  <span className="text-xs text-slate-400">{c._count}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Tags: searchable multi-select, shared with the admin issue form. */}
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("tags")}
        </div>
        <MultiSelectDropdown
          options={tags.map((tg) => ({ id: tg.id, label: tg.name }))}
          selectedIds={selectedTagIds}
          onChange={setTags}
          placeholder={t("allTags")}
          searchPlaceholder={t("searchTags")}
          emptyText={t("noTagsFound")}
        />
      </div>
    </aside>
  );
}
