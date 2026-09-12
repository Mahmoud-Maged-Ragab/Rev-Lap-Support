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
import { auditLog, type AuditAction } from "@/lib/audit";

type TargetRow = {
  id: string;
  email?: string;
  role: string;
  disabled?: boolean | null;
};

/**
 * Case-insensitive count of accounts with the given canonical role.
 *
 * `role` is a Postgres enum column (not text), so PostgREST's `ilike.` filter
 * can't be pushed down to the DB — enums have no `~~*` operator, which is what
 * produced `operator does not exist: "Role" ~~* unknown`. Fetch the (small)
 * admins table and compare with the same `normalizeRole` used everywhere else,
 * so legacy mixed-case rows ("Support", "Owner") still match correctly.
 */
async function countByRole(role: Role, opts: { activeOnly?: boolean } = {}): Promise<number> {
  const { data } = await selectRows<{ role: string; disabled?: boolean | null }>("admins", {
    select: "role,disabled",
  });
  return data.filter(
    (r) => normalizeRole(r.role) === role && (!opts.activeOnly || !r.disabled)
  ).length;
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const target = await selectOne<TargetRow>("admins", {
    select: "id,email,role,disabled",
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

  // `issues.admin_id` (creator) and `issue_history.adminid` (actor) both have a
  // foreign key to admins with no ON DELETE action, so the delete below 409s
  // with `violates foreign key constraint ... on table "issues"` unless those
  // references are cleared first. Nulling them preserves the issues/history
  // rows themselves — only the "authored/acted by" attribution is lost, which
  // is expected once the account is gone (the audit log below still records
  // who was deleted and by whom).
  await updateRows("issues", { admin_id: `eq.${params.id}` }, { admin_id: null }, { returning: false });
  await updateRows("issue_history", { adminid: `eq.${params.id}` }, { adminid: null }, { returning: false });

  await deleteRows("admins", { id: `eq.${params.id}` }, { returning: false });
  await auditLog({
    entityType: "user",
    entityId: target.id,
    action: "DELETE_USER",
    actor: session,
    oldData: target as unknown as Record<string, unknown>,
    request: req,
  });
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
    select: "id,email,role,disabled",
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

  // Most specific action wins: role change > disable/enable > generic update.
  const action: AuditAction = wantsRoleChange
    ? "ROLE_CHANGED"
    : wantsDisableChange
      ? (body.disabled ? "DISABLE_USER" : "ENABLE_USER")
      : "UPDATE_USER";
  await auditLog({
    entityType: "user",
    entityId: target.id,
    action,
    actor: session,
    oldData: target as unknown as Record<string, unknown>,
    newData: (rows[0] ?? patch) as unknown as Record<string, unknown>,
    request: req,
  });

  return NextResponse.json(rows[0] ?? { ok: true });
}
