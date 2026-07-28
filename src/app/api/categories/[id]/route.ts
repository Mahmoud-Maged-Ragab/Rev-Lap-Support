import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { deleteRows, selectOne } from "@/lib/supabase";
import { auditLog } from "@/lib/audit";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await selectOne<{ id: string; name: string }>("categories", {
    select: "id,name",
    filters: { id: `eq.${params.id}` },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await deleteRows("categories", { id: `eq.${params.id}` }, { returning: false });
    await auditLog({
      entityType: "category",
      entityId: existing.id,
      action: "DELETE_CATEGORY",
      actor: session,
      oldData: existing,
      request: req,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
