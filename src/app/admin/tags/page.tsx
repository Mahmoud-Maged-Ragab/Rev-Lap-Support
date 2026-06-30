import { selectAll } from "@/lib/supabase";
import { requireContentAccess } from "@/lib/guards";
import { TagManager } from "./TagManager";

export const dynamic = "force-dynamic";

type TagWithCount = {
  id: string;
  name: string;
  issue_tags: { count: number }[];
};

export default async function TagsPage() {
  await requireContentAccess();

  const tags = await selectAll<TagWithCount>("tags", {
    select: "id,name,issue_tags(count)",
    order: "name.asc",
  });
  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Tags</h1>
        <p className="text-sm text-slate-500">
          Tags are created automatically when used on issues; manage extras here.
        </p>
      </div>
      <TagManager
        initial={tags.map((t) => ({
          id: t.id,
          name: t.name,
          count: t.issue_tags?.[0]?.count ?? 0,
        }))}
      />
    </div>
  );
}
