import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { deleteRows, selectOne } from "@/lib/supabase";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await selectOne<{ id: string }>("categories", {
    select: "id",
    filters: { id: `eq.${params.id}` },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await deleteRows("categories", { id: `eq.${params.id}` }, { returning: false });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
