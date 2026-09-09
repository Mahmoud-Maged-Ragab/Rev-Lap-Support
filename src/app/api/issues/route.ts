import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { createIssue, listIssues } from "@/lib/issues";
import { logIssueHistory } from "@/lib/history";
import { auditLog } from "@/lib/audit";
import { IssueInputSchema } from "@/lib/validation";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? undefined;
  const categoryId = url.searchParams.get("category") ?? undefined;
  const tagId = url.searchParams.get("tag") ?? undefined;
  const sortParam = url.searchParams.get("sort");
  const sort =
    sortParam === "views" || sortParam === "oldest" || sortParam === "newest"
      ? sortParam
      : "newest";
  const page = Number(url.searchParams.get("page") ?? "1") || 1;
  const pageSize = Math.min(50, Number(url.searchParams.get("pageSize") ?? "20") || 20);

  // Handle fetching by IDs (for saved issues)
  const idsParam = url.searchParams.get("ids");
  if (idsParam) {
    const ids = idsParam.split(",").filter(Boolean).slice(0, 100); // Max 100 IDs
    if (ids.length === 0) {
      return NextResponse.json([]);
    }

    const { items } = await listIssues({ page: 1, pageSize: ids.length });
    const filtered = items.filter((item) => ids.includes(item.id));
    // Return in the same order as requested IDs
    const ordered = ids
      .map((id) => filtered.find((item) => item.id === id))
      .filter((item): item is NonNullable<typeof item> => !!item);
    return NextResponse.json(ordered);
  }

  const result = await listIssues({ q, categoryId, tagId, sort, page, pageSize });
  return NextResponse.json(result);
}

export async function POST(req: Request) {
  // Middleware already blocked unauthorized requests, but defend in depth.
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

  const issue = await createIssue(parsed.data, session.sub);
  await Promise.all([
    logIssueHistory({
      issueId: issue.id,
      adminId: session.sub,
      action: "create",
      snapshot: {
        title: parsed.data.title,
        description: parsed.data.description,
        solution: parsed.data.solution,
      },
    }),
    auditLog({
      entityType: "issue",
      entityId: issue.id,
      action: "CREATE_ISSUE",
      actor: session,
      newData: { slug: issue.slug, ...parsed.data },
      request: req,
    }),
  ]);
  return NextResponse.json({ id: issue.id, slug: issue.slug }, { status: 201 });
}
