/**
 * Central, case-safe authorization model.
 *
 * Single source of truth for roles and what each role may do. Used by middleware,
 * server components (pages), and API route handlers — NEVER hardcode role string
 * comparisons elsewhere; call these helpers instead.
 *
 * Roles are stored in the DB with inconsistent casing (legacy rows: "ADMIN",
 * "Support", "Owner"). Every check goes through `normalizeRole`, which is
 * case-insensitive, so legacy rows keep working. New rows are written in the
 * canonical UPPERCASE form returned here.
 *
 * This module must stay pure (no `next/headers`, no Node-only APIs) so the Edge
 * middleware can import it.
 */

/** Canonical role identifiers, highest privilege first. */
export type Role = "OWNER" | "ADMIN" | "SUPPORT";

/** Privilege ranking — higher number = more privilege. */
const RANK: Record<Role, number> = {
  OWNER: 3,
  ADMIN: 2,
  SUPPORT: 1,
};

/**
 * Case-insensitively map any stored/incoming value to a canonical Role.
 * Unknown values fall back to the LEAST-privileged role (SUPPORT) so a typo or
 * unexpected value can never accidentally grant elevated access.
 */
export function normalizeRole(v: unknown): Role {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "OWNER") return "OWNER";
  if (s === "ADMIN") return "ADMIN";
  return "SUPPORT";
}

/** Human-friendly label for display ("Owner" | "Admin" | "Support"). */
export function roleLabel(v: unknown): string {
  switch (normalizeRole(v)) {
    case "OWNER":
      return "Owner";
    case "ADMIN":
      return "Admin";
    default:
      return "Support";
  }
}

/** True if `a` is strictly more privileged than `b`. */
function outranks(a: unknown, b: unknown): boolean {
  return RANK[normalizeRole(a)] > RANK[normalizeRole(b)];
}

// ---------------------------------------------------------------------------
// Capability checks — keyed off the actor's role.
// ---------------------------------------------------------------------------

/** Only OWNER may open the /owner dashboard. */
export function canAccessOwnerPanel(role: unknown): boolean {
  return normalizeRole(role) === "OWNER";
}

/** OWNER and ADMIN may view/manage user accounts. */
export function canManageUsers(role: unknown): boolean {
  const r = normalizeRole(role);
  return r === "OWNER" || r === "ADMIN";
}

/** OWNER, ADMIN and SUPPORT may all manage content (issues/categories/tags). */
export function canManageContent(role: unknown): boolean {
  const r = normalizeRole(role);
  return r === "OWNER" || r === "ADMIN" || r === "SUPPORT";
}

/** OWNER and ADMIN may create SUPPORT accounts. */
export function canCreateSupport(role: unknown): boolean {
  return canManageUsers(role);
}

/** Only OWNER may create ADMIN accounts. */
export function canCreateAdmin(role: unknown): boolean {
  return normalizeRole(role) === "OWNER";
}

/**
 * OWNER accounts can NEVER be created through the UI or API — they exist only by
 * manual database setup. This is intentionally always false.
 */
export function canCreateOwner(): boolean {
  return false;
}

/** Only OWNER may change another account's role. */
export function canChangeRoles(role: unknown): boolean {
  return normalizeRole(role) === "OWNER";
}

/**
 * Which roles an actor is allowed to assign when creating/editing a user.
 * OWNER → [ADMIN, SUPPORT]; ADMIN → [SUPPORT]; SUPPORT → [].
 * OWNER is never assignable (see `canCreateOwner`).
 */
export function assignableRoles(role: unknown): Role[] {
  switch (normalizeRole(role)) {
    case "OWNER":
      return ["ADMIN", "SUPPORT"];
    case "ADMIN":
      return ["SUPPORT"];
    default:
      return [];
  }
}

/** Can `actor` create an account with the (already-normalized) `desired` role? */
export function canCreateRole(actor: unknown, desired: unknown): boolean {
  const target = normalizeRole(desired);
  return assignableRoles(actor).includes(target);
}

/**
 * Can `actor` edit/delete/disable the account whose role is `target`?
 *  - OWNER may manage anyone (last-owner protection is enforced separately).
 *  - ADMIN may manage anyone who is NOT an OWNER.
 *  - SUPPORT may manage no one.
 */
export function canManageTarget(actor: unknown, target: unknown): boolean {
  const a = normalizeRole(actor);
  if (a === "OWNER") return true;
  if (a === "ADMIN") return normalizeRole(target) !== "OWNER";
  return false;
}

/**
 * Whether `actor` may delete users. When `target` is supplied, the role
 * hierarchy is enforced (an ADMIN cannot delete an OWNER); without it, this just
 * reports whether the actor has any user-deletion privilege at all.
 */
export function canDeleteUser(actor: unknown, target?: unknown): boolean {
  if (target !== undefined) return canManageTarget(actor, target);
  return canManageUsers(actor);
}

export { RANK, outranks };
