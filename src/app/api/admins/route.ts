import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { readSession } from "@/lib/auth";
import {
  normalizeRole,
  canManageUsers,
  canCreateRole,
  roleLabel,
} from "@/lib/permissions";
import { AdminInputSchema } from "@/lib/validation";
import { insertRow, selectAll, selectOne, SupabaseError } from "@/lib/supabase";
import { generateId } from "@/lib/issues";

type AdminRow = {
  id: string;
  email: string;
  role: string;
  disabled?: boolean | null;
  createdAt: string;
  updatedAt: string;
};

export async function GET() {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admins = await selectAll<AdminRow>("admins", {
    select: "id,email,role,disabled,createdAt,updatedAt",
    order: "createdAt.asc",
  });
  return NextResponse.json({ items: admins });
}

export async function POST(req: Request) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageUsers(session.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = AdminInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Canonicalize the requested role, then verify the actor is allowed to assign
  // it. This is what blocks ADMIN from creating ADMIN/OWNER and blocks everyone
  // from creating OWNER through the API.
  const desiredRole = normalizeRole(parsed.data.role ?? "SUPPORT");
  if (!canCreateRole(session.role, desiredRole)) {
    return NextResponse.json(
      { error: `You are not allowed to create a ${roleLabel(desiredRole)} account` },
      { status: 403 }
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.password;

  const existing = await selectOne<{ id: string }>("admins", {
    select: "id",
    filters: { email: `eq.${email}` },
  });
  if (existing) {
    return NextResponse.json({ error: "An admin with that email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date().toISOString();
  try {
    const rows = await insertRow<AdminRow>(
      "admins",
      {
        id: generateId(),
        email,
        passwordHash,
        role: desiredRole, // stored in canonical UPPERCASE
        disabled: false,
        createdAt: now,
        updatedAt: now,
      },
      { select: "id,email,role,disabled,createdAt,updatedAt" }
    );

    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    if (err instanceof SupabaseError && err.status === 409) {
      return NextResponse.json({ error: "An admin with that email already exists" }, { status: 409 });
    }
    throw err;
  }
}
