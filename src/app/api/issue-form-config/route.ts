import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { getIssueFormConfig, saveIssueFormConfig } from "@/lib/issueFormConfig";
import { IssueFormConfigSchema } from "@/lib/validation";

/**
 * Persistence endpoint for the Issue Creation drag-and-drop form builder.
 * GET is public read (same trust level as /api/categories, /api/tags — the
 * Issue Creation page needs this to render for any visitor who can reach
 * it, and the layout itself isn't sensitive). PUT requires a session, same
 * as every other content-mutation route in this app.
 */
export async function GET() {
  const fields = await getIssueFormConfig();
  return NextResponse.json({ fields });
}

export async function PUT(req: Request) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const fields = (body as { fields?: unknown })?.fields;
  const parsed = IssueFormConfigSchema.safeParse(fields);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  await saveIssueFormConfig(parsed.data, session.sub);
  return NextResponse.json({ ok: true, fields: parsed.data });
}
