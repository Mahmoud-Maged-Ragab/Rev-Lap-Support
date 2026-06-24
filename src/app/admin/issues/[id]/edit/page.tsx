import { getIssueById } from "@/lib/issues";
import { selectAll } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { IssueForm } from "../../IssueForm";

export const dynamic = "force-dynamic";

type Row = { id: string; name: string };

export default async function EditIssuePage({ params }: { params: { id: string } }) {
  const [issue, categories, allTags] = await Promise.all([
    getIssueById(params.id),
    selectAll<Row>("categories", { select: "id,name", order: "name.asc" }),
    selectAll<Row>("tags", { select: "id,name", order: "name.asc" }),
  ]);
  if (!issue) notFound();

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Edit issue</h1>
        <p className="text-sm text-slate-500">/{issue.slug}</p>
      </div>
      <IssueForm
        categories={categories}
        allTags={allTags}
        initial={{
          id: issue.id,
          title: issue.title,
          description: issue.description,
          errorMessage: issue.errorMessage,
          cause: issue.cause,
          solution: issue.solution,
          categoryId: issue.categoryId,
          tags: issue.tags.map((t) => ({ id: t.id, name: t.name })),
          images: issue.images,
          videoUrl: issue.videoUrl,
        }}
      />
    </div>
  );
}
