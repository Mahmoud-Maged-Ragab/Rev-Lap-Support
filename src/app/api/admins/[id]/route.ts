import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { deleteRows, selectOne, selectRows } from "@/lib/supabase";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const target = await selectOne<{ id: string; role: "ADMIN" | "Support" }>("admins", {
    select: "id,role",
    filters: { id: `eq.${params.id}` },
  });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (target.role === "ADMIN") {
    const { count } = await selectRows("admins", {
      select: "id",
      filters: { role: "eq.ADMIN" },
      limit: 1,
      count: "exact",
    });
    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the last remaining admin" },
        { status: 400 },
      );
    }
  }

  await deleteRows("admins", { id: `eq.${params.id}` }, { returning: false });
  return NextResponse.json({ ok: true });
}
