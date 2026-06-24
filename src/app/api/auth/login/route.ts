import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { LoginSchema } from "@/lib/validation";
import { createSession } from "@/lib/auth";
import { selectOne } from "@/lib/supabase";

type AdminRow = {
  id: string;
  email: string;
  passwordHash: string;
  role: "ADMIN" | "SUPPORT";
};

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credentials format" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.password;

  const admin = await selectOne<AdminRow>("admins", {
    select: "id,email,passwordHash,role",
    filters: { email: `eq.${email}` },
  });

  // Run bcrypt either way so we don't leak existence via timing.
  const hash = admin?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi";
  const ok = await bcrypt.compare(password, hash);

  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[auth.login] email=${email} found=${!!admin} passwordLen=${password.length} hashLen=${admin?.passwordHash.length ?? 0} compare=${ok}`
    );
  }

  if (!admin || !ok) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  await createSession({
    sub: admin.id,
    email: admin.email,
    role: admin.role === "ADMIN" ? "ADMIN" : "SUPPORT",
  });
  return NextResponse.json({ ok: true, role: admin.role });
}
