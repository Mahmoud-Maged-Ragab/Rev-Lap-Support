/**
 * Server-side page guards. Call these at the top of a server component to enforce
 * authorization *before rendering* — real checks, not just hidden UI.
 *
 * Each guard reads the session, redirects unauthenticated users to the login
 * page, redirects authenticated-but-unauthorized users to their role home
 * (middleware turns "/admin" into the correct landing page per role), and
 * otherwise returns the session for the page to use.
 */

import { redirect } from "next/navigation";
import { readSession, type SessionPayload } from "@/lib/auth";
import {
  canManageUsers,
  canManageContent,
  canAccessOwnerPanel,
} from "@/lib/permissions";

async function requireSessionOrLogin(): Promise<SessionPayload> {
  const session = await readSession();
  if (!session) redirect("/admin/login");
  return session;
}

/** OWNER or ADMIN — user/account management areas. */
export async function requireUserManagement(): Promise<SessionPayload> {
  const session = await requireSessionOrLogin();
  if (!canManageUsers(session.role)) redirect("/admin");
  return session;
}

/** OWNER, ADMIN or SUPPORT — content management areas. */
export async function requireContentAccess(): Promise<SessionPayload> {
  const session = await requireSessionOrLogin();
  if (!canManageContent(session.role)) redirect("/admin");
  return session;
}

/** OWNER only — the owner dashboard. */
export async function requireOwner(): Promise<SessionPayload> {
  const session = await requireSessionOrLogin();
  if (!canAccessOwnerPanel(session.role)) redirect("/admin");
  return session;
}
