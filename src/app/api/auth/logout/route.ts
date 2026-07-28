import { NextResponse } from "next/server";
import { destroySession, readSession } from "@/lib/auth";
import { auditLog } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await readSession();
  await destroySession();
  if (session) {
    await auditLog({
      entityType: "auth",
      entityId: session.sub,
      action: "LOGOUT",
      actor: session,
      request: req,
    });
  }
  return NextResponse.json({ ok: true });
}
