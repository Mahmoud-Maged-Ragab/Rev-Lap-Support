import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { CategoryInputSchema } from "@/lib/validation";
import { insertRow, selectAll, SupabaseError } from "@/lib/supabase";
import { generateId } from "@/lib/issues";

export async function GET() {
  const cats = await selectAll<{ id: string; name: string }>("categories", {
    select: "id,name",
    order: "name.asc",
  });
  return NextResponse.json(cats);
}

export async function POST(req: Request) {
  const session = await readSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CategoryInputSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const name = parsed.data.name.trim();
  try {
    const rows = await insertRow<{ id: string; name: string }>(
      "categories",
      { id: generateId(), name, createdAt: new Date().toISOString() },
      { select: "id,name" },
    );
    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    if (err instanceof SupabaseError && err.status === 409) {
      return NextResponse.json(
        { error: "Category already exists" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Category already exists" },
      { status: 409 },
    );
  }
}
