import { selectAll } from "@/lib/supabase";
import { requireContentAccess } from "@/lib/guards";
import { getIssueFormConfig } from "@/lib/issueFormConfig";
import { IssueForm } from "../IssueForm";

export const dynamic = "force-dynamic";

type Row = { id: string; name: string };

export default async function NewIssuePage() {
  await requireContentAccess();

  const [categories, allTags, fieldConfig] = await Promise.all([
    selectAll<Row>("categories", { select: "id,name", order: "name.asc" }),
    selectAll<Row>("tags", { select: "id,name", order: "name.asc" }),
    getIssueFormConfig(),
  ]);
  return (
    <div className="max-w-[1400px] space-y-5">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">New issue</h1>
        <p className="text-sm text-slate-500">Document a problem and its known fix.</p>
      </div>
      <IssueForm
        categories={categories}
        allTags={allTags}
        fieldConfig={fieldConfig}
      />
    </div>
  );
}
