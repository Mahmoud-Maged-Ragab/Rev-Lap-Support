import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { deleteRows, selectOne } from "@/lib/supabase";
import { auditLog } from "@/lib/audit";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await selectOne<{ id: string; name: string }>("tags", {
    select: "id,name",
    filters: { id: `eq.${params.id}` },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    // Remove join rows first in case CASCADE isn't wired up at the DB.
    await deleteRows("issue_tags", { tagId: `eq.${params.id}` }, { returning: false });
    await deleteRows("tags", { id: `eq.${params.id}` }, { returning: false });
    await auditLog({
      entityType: "tag",
      entityId: existing.id,
      action: "DELETE_TAG",
      actor: session,
      oldData: existing,
      request: req,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
