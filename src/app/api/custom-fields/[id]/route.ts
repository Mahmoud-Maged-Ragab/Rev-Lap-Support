import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { archiveCustomField, getCustomFieldById, updateCustomField } from "@/lib/customFields";
import { CustomFieldInputSchema } from "@/lib/validation";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
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

  const parsed = CustomFieldInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await getCustomFieldById(params.id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const field = await updateCustomField(params.id, parsed.data);
  return NextResponse.json({ field });
}

/** Soft delete (archive) — see lib/customFields.ts for why this never
 *  hard-deletes the row or its historical values. */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await getCustomFieldById(params.id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await archiveCustomField(params.id);
  return NextResponse.json({ ok: true });
}
