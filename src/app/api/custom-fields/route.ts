import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { createCustomField, listCustomFields } from "@/lib/customFields";
import { CustomFieldInputSchema } from "@/lib/validation";

/**
 * Data-driven custom field definitions for the Issue Creation form (see
 * IssueForm.tsx's inline "+ Add Custom Field" flow). GET is public read,
 * same trust level as /api/categories, /api/tags. POST requires a session,
 * same as every other content-mutation route in this app.
 */
export async function GET() {
  const fields = await listCustomFields();
  return NextResponse.json({ fields });
}

export async function POST(req: Request) {
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

  const field = await createCustomField(parsed.data);
  return NextResponse.json({ field }, { status: 201 });
}
