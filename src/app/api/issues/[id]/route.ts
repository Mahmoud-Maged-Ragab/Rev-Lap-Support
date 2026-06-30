import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { deleteIssue, getIssueById, updateIssue } from "@/lib/issues";
import { IssueInputSchema } from "@/lib/validation";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const issue = await getIssueById(params.id);
  if (!issue) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(issue);
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

  const updated = await updateIssue(params.id, parsed.data);
  return NextResponse.json({ id: updated.id, slug: updated.slug });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await getIssueById(params.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deleteIssue(params.id);
  return NextResponse.json({ ok: true });
}
