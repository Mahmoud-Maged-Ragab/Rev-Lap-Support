"use client";

import { useRouter, useSearchParams } from "next/navigation";

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

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    next.delete("page");
    router.push(`/?${next.toString()}`);
  }

  const sort = params.get("sort") ?? "newest";
  const cat = params.get("category") ?? "";
  const tag = params.get("tag") ?? "";

  return (
    <aside className="space-y-6">
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Categories
        </div>
        <ul className="space-y-1 text-sm">
          <li>
            <button
              onClick={() => setParam("category", null)}
              className={
                "w-full rounded px-2 py-1 text-left hover:bg-slate-50 " +
                (!cat ? "font-medium text-ink-900" : "text-slate-700")
              }
            >
              All categories
            </button>
          </li>
          {categories.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => setParam("category", c.id)}
                className={
                  "flex w-full items-center justify-between rounded px-2 py-1 text-left hover:bg-slate-50 " +
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

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Tags
        </div>
        <div className="flex flex-wrap gap-1.5">
          {tag && (
            <button
              onClick={() => setParam("tag", null)}
              className="chip border-slate-300 bg-white"
            >
              clear ×
            </button>
          )}
          {tags.map((t) => (
            <button
              key={t.id}
              onClick={() => setParam("tag", t.id)}
              className={
                "chip cursor-pointer " +
                (tag === t.id
                  ? "!border-slate-900 !bg-slate-900 !text-white"
                  : "")
              }
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
