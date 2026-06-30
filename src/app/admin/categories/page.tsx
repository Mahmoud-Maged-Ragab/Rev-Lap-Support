import { selectAll } from "@/lib/supabase";
import { requireContentAccess } from "@/lib/guards";
import { CategoryManager } from "./CategoryManager";

export const dynamic = "force-dynamic";

type CategoryWithCount = {
  id: string;
  name: string;
  issues: { count: number }[];
};

export default async function CategoriesPage() {
  await requireContentAccess();

  const categories = await selectAll<CategoryWithCount>("categories", {
    select: "id,name,issues(count)",
    order: "name.asc",
  });
  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Categories</h1>
        <p className="text-sm text-slate-500">Group related issues together.</p>
      </div>
      <CategoryManager
        initial={categories.map((c) => ({
          id: c.id,
          name: c.name,
          count: c.issues?.[0]?.count ?? 0,
        }))}
      />
    </div>
  );
}
