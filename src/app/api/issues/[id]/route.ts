import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { deleteIssue, getIssueById, updateIssue } from "@/lib/issues";
import { computeIssueChanges, logIssueHistory } from "@/lib/history";
import { auditLog, type AuditAction } from "@/lib/audit";
import { selectAll } from "@/lib/supabase";
import { IssueInputSchema } from "@/lib/validation";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const issue = await getIssueById(params.id);
  if (!issue) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(issue);
}

/** id → name lookup for the categories/tags referenced by a diff. */
async function nameMaps(ids: {
  categoryIds: (string | null | undefined)[];
  tagIds: string[];
}): Promise<{ categoryNames: Record<string, string>; tagNames: Record<string, string> }> {
  const catIds = Array.from(new Set(ids.categoryIds.filter((v): v is string => !!v)));
  const tagIds = Array.from(new Set(ids.tagIds));
  const [cats, tags] = await Promise.all([
    catIds.length
      ? selectAll<{ id: string; name: string }>("categories", {
          select: "id,name",
          filters: { id: `in.(${catIds.join(",")})` },
        })
      : Promise.resolve([]),
    tagIds.length
      ? selectAll<{ id: string; name: string }>("tags", {
          select: "id,name",
          filters: { id: `in.(${tagIds.join(",")})` },
        })
      : Promise.resolve([]),
  ]);
  return {
    categoryNames: Object.fromEntries(cats.map((c) => [c.id, c.name])),
    tagNames: Object.fromEntries(tags.map((t) => [t.id, t.name])),
  };
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = IssueInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }
  const existing = await getIssueById(params.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let updated: { id: string; slug: string };
  try {
    updated = await updateIssue(params.id, parsed.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update issue";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const maps = await nameMaps({
    categoryIds: [existing.categoryId, parsed.data.categoryId],
    tagIds: parsed.data.tagIds ?? [],
  });
  const changes = computeIssueChanges(existing, parsed.data, maps);

  // One audit insert per action; pick the most specific label when the edit
  // touched exactly one aspect.
  const changedFields = changes.map((c) => c.field);
  const auditAction: AuditAction =
    changedFields.length === 1 && changedFields[0] === "category"
      ? "CATEGORY_CHANGED"
      : changedFields.length === 1 && changedFields[0] === "tags"
        ? "TAGS_CHANGED"
        : "UPDATE_ISSUE";

  await Promise.all([
    logIssueHistory({
      issueId: params.id,
      adminId: session.sub,
      action: "update",
      changes,
    }),
    auditLog({
      entityType: "issue",
      entityId: params.id,
      action: auditAction,
      actor: session,
      oldData: Object.fromEntries(changes.map((c) => [c.field, c.old])),
      newData: Object.fromEntries(changes.map((c) => [c.field, c.new])),
      request: req,
    }),
  ]);

  return NextResponse.json({ id: updated.id, slug: updated.slug });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await getIssueById(params.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Logged before the delete; the FK on issue_history.issueid cascades, so
  // this record vanishes with the issue — kept for the audit window between
  // now and the delete, and future-proof if the FK is relaxed to SET NULL.
  await logIssueHistory({
    issueId: params.id,
    adminId: session.sub,
    action: "delete",
    snapshot: { title: existing.title },
  });

  await deleteIssue(params.id);
  // audit_logs has no FK to issues, so unlike issue_history this record
  // survives the deletion.
  await auditLog({
    entityType: "issue",
    entityId: params.id,
    action: "DELETE_ISSUE",
    actor: session,
    oldData: {
      title: existing.title,
      slug: existing.slug,
      description: existing.description,
      categoryId: existing.categoryId,
      tags: existing.tags.map((t) => t.name),
    },
    request: req,
  });
  return NextResponse.json({ ok: true });
}
