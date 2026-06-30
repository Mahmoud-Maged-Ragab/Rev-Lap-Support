import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { LoginSchema } from "@/lib/validation";
import { createSession } from "@/lib/auth";
import { normalizeRole } from "@/lib/permissions";
import { selectOne } from "@/lib/supabase";

type AdminRow = {
  id: string;
  email: string;
  passwordHash: string;
  role: string; // stored casing varies ("ADMIN" | "Support" | "Owner" | …)
  disabled?: boolean | null;
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
    select: "id,email,passwordHash,role,disabled",
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

  // Block deactivated accounts (checked after the bcrypt compare to avoid
  // leaking which emails exist via response timing).
  if (admin.disabled) {
    return NextResponse.json({ error: "This account has been disabled" }, { status: 403 });
  }

  // Persist the CANONICAL role in the session so OWNER (and any legacy mixed-case
  // value) is represented correctly, not collapsed to SUPPORT.
  const role = normalizeRole(admin.role);
  await createSession({
    sub: admin.id,
    email: admin.email,
    role,
  });
  return NextResponse.json({ ok: true, role });
}
