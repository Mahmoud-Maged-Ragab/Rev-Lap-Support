import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import {
  normalizeRole,
  canManageTarget,
  canChangeRoles,
  assignableRoles,
  roleLabel,
  type Role,
} from "@/lib/permissions";
import { deleteRows, selectOne, selectRows, updateRows } from "@/lib/supabase";

type TargetRow = {
  id: string;
  role: string;
  disabled?: boolean | null;
};

/** Case-insensitive count of accounts with the given canonical role. */
async function countByRole(role: Role, opts: { activeOnly?: boolean } = {}): Promise<number> {
  const filters: Record<string, string> = { role: `ilike.${role}` };
  if (opts.activeOnly) filters.disabled = "is.false";
  const { count } = await selectRows("admins", {
    select: "id",
    filters,
    limit: 1,
    count: "exact",
  });
  return count ?? 0;
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const target = await selectOne<TargetRow>("admins", {
    select: "id,role",
    filters: { id: `eq.${params.id}` },
  });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const targetRole = normalizeRole(target.role);

  // Authorization: the actor must outrank/own the target. This blocks ADMIN from
  // deleting OWNER accounts and SUPPORT from deleting anyone.
  if (!canManageTarget(session.role, targetRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Never let an account delete itself (avoids locking yourself out mid-session).
  if (target.id === session.sub) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  }

  // Protect the last remaining OWNER / ADMIN so the system can't be orphaned.
  if (targetRole === "OWNER" && (await countByRole("OWNER")) <= 1) {
    return NextResponse.json({ error: "Cannot delete the last remaining owner" }, { status: 400 });
  }
  if (targetRole === "ADMIN" && (await countByRole("ADMIN")) <= 1) {
    return NextResponse.json({ error: "Cannot delete the last remaining admin" }, { status: 400 });
  }

  await deleteRows("admins", { id: `eq.${params.id}` }, { returning: false });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { role?: unknown; disabled?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const wantsRoleChange = body.role !== undefined;
  const wantsDisableChange = typeof body.disabled === "boolean";
  if (!wantsRoleChange && !wantsDisableChange) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const target = await selectOne<TargetRow>("admins", {
    select: "id,role,disabled",
    filters: { id: `eq.${params.id}` },
  });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const targetRole = normalizeRole(target.role);

  // Actor must be allowed to manage this target at all.
  if (!canManageTarget(session.role, targetRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const patch: Record<string, unknown> = {};

  // --- Role change ----------------------------------------------------------
  if (wantsRoleChange) {
    if (!canChangeRoles(session.role)) {
      return NextResponse.json({ error: "You are not allowed to change roles" }, { status: 403 });
    }
    const newRole = normalizeRole(body.role);
    // Only roles the actor may assign are accepted — this rejects promoting
    // anyone to OWNER (OWNER is never in the assignable set).
    if (!assignableRoles(session.role).includes(newRole)) {
      return NextResponse.json(
        { error: `You cannot assign the ${roleLabel(newRole)} role` },
        { status: 403 }
      );
    }
    // Demoting the last owner would orphan the system.
    if (targetRole === "OWNER" && newRole !== "OWNER" && (await countByRole("OWNER")) <= 1) {
      return NextResponse.json({ error: "Cannot demote the last remaining owner" }, { status: 400 });
    }
    if (targetRole === "ADMIN" && newRole !== "ADMIN" && (await countByRole("ADMIN")) <= 1) {
      return NextResponse.json({ error: "Cannot demote the last remaining admin" }, { status: 400 });
    }
    patch.role = newRole; // canonical UPPERCASE
  }

  // --- Disable / enable -----------------------------------------------------
  if (wantsDisableChange) {
    const disabled = body.disabled as boolean;
    if (disabled && target.id === session.sub) {
      return NextResponse.json({ error: "You cannot disable your own account" }, { status: 400 });
    }
    // Don't allow disabling the last ACTIVE owner.
    if (disabled && targetRole === "OWNER" && (await countByRole("OWNER", { activeOnly: true })) <= 1) {
      return NextResponse.json({ error: "Cannot disable the last active owner" }, { status: 400 });
    }
    patch.disabled = disabled;
  }

  patch.updatedAt = new Date().toISOString();

  const rows = await updateRows<TargetRow & { email: string }>(
    "admins",
    { id: `eq.${params.id}` },
    patch,
    { select: "id,email,role,disabled,updatedAt" }
  );
  return NextResponse.json(rows[0] ?? { ok: true });
}
