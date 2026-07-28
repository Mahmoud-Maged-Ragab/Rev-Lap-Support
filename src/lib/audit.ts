/**
 * Centralized audit logging.
 *
 * Every important authenticated action is recorded in the existing
 * `audit_logs` table (snake_case columns: id, entity_type, entity_id, action,
 * actor_id, actor_email, old_data, new_data, ip_address, user_agent,
 * created_at — created_at defaults server-side).
 *
 * All call sites go through `auditLog()` — never insert into audit_logs
 * directly. Logging is fail-safe: an audit failure is logged to the console
 * and NEVER breaks the action being audited.
 */

import type { SessionPayload } from "./auth";
import { generateId } from "./issues";
import { ilikePattern, insertRow, selectAll, selectRows } from "./supabase";
import { parseDbTime } from "./history";

export type AuditEntityType = "user" | "issue" | "category" | "tag" | "auth";

export type AuditAction =
  // Users
  | "CREATE_USER"
  | "UPDATE_USER"
  | "DELETE_USER"
  | "DISABLE_USER"
  | "ENABLE_USER"
  | "ROLE_CHANGED"
  | "PASSWORD_RESET"
  | "LOGIN"
  | "LOGOUT"
  // Issues
  | "CREATE_ISSUE"
  | "UPDATE_ISSUE"
  | "DELETE_ISSUE"
  | "CATEGORY_CHANGED"
  | "TAGS_CHANGED"
  // Categories
  | "CREATE_CATEGORY"
  | "UPDATE_CATEGORY"
  | "DELETE_CATEGORY"
  // Tags
  | "CREATE_TAG"
  | "UPDATE_TAG"
  | "DELETE_TAG";

/** Fields that must never be persisted in an audit payload. */
const SENSITIVE_KEYS = new Set(["passwordHash", "password"]);

/** Strip sensitive fields from a record before storing it. */
function sanitize(
  data: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!data) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(k)) continue;
    out[k] = v;
  }
  return out;
}

/** Client IP from proxy headers; null when unavailable (e.g. local dev). */
export function requestIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip");
}

export interface AuditLogInput {
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  /** The authenticated session, or explicit actor fields (e.g. at login). */
  actor: Pick<SessionPayload, "sub" | "email"> | null;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  /** The incoming request, for IP/user-agent capture. */
  request?: Request;
}

/**
 * Record one audit entry. Fire-and-forget semantics: any failure is logged
 * and swallowed so the audited operation always succeeds independently.
 */
export async function auditLog(input: AuditLogInput): Promise<void> {
  try {
    await insertRow(
      "audit_logs",
      {
        id: generateId(),
        entity_type: input.entityType,
        entity_id: input.entityId,
        action: input.action,
        actor_id: input.actor?.sub ?? null,
        actor_email: input.actor?.email ?? null,
        old_data: sanitize(input.oldData),
        new_data: sanitize(input.newData),
        ip_address: input.request ? requestIp(input.request) : null,
        user_agent: input.request
          ? (input.request.headers.get("user-agent") ?? null)
          : null,
      },
      { returning: false },
    );
  } catch (err) {
    console.error("[audit] failed to write audit log", input.action, err);
  }
}

// ---------------------------------------------------------------------------
// Querying (for the /admin/audit-logs page)
// ---------------------------------------------------------------------------

export type AuditLogEntry = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string | null;
  actorEmail: string | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
};

export interface AuditListOptions {
  /** Free text: actor email substring or exact entity id. */
  q?: string;
  entityType?: string;
  action?: string;
  actorId?: string;
  /** ISO date (yyyy-mm-dd), inclusive. */
  from?: string;
  /** ISO date (yyyy-mm-dd), inclusive. */
  to?: string;
  page?: number;
  pageSize?: number;
}

type AuditRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string | null;
  actor_email: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

export async function listAuditLogs(
  opts: AuditListOptions = {},
): Promise<{ items: AuditLogEntry[]; total: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? 20));

  const filters: Record<string, string> = {};
  if (opts.entityType) filters["entity_type"] = `eq.${opts.entityType}`;
  if (opts.action) filters["action"] = `eq.${opts.action}`;
  if (opts.actorId) filters["actor_id"] = `eq.${opts.actorId}`;
  if (opts.from) filters["created_at"] = `gte.${opts.from}T00:00:00`;
  if (opts.to) {
    const next = new Date(`${opts.to}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    const lt = `lt.${next.toISOString().slice(0, 10)}T00:00:00`;
    if (filters["created_at"]) {
      filters["and"] = `(created_at.${filters["created_at"]},created_at.${lt})`;
      delete filters["created_at"];
    } else {
      filters["created_at"] = lt;
    }
  }
  if (opts.q && opts.q.trim()) {
    const q = opts.q.trim();
    filters["or"] =
      `(actor_email.ilike.${ilikePattern(q)},entity_id.eq.${q})`;
  }

  const { data, count } = await selectRows<AuditRow>("audit_logs", {
    select:
      "id,entity_type,entity_id,action,actor_id,actor_email,old_data,new_data,ip_address,user_agent,created_at",
    filters,
    order: "created_at.desc",
    limit: pageSize,
    offset: (page - 1) * pageSize,
    count: "exact",
  });

  return {
    items: data.map((r) => ({
      id: r.id,
      entityType: r.entity_type,
      entityId: r.entity_id,
      action: r.action,
      actorId: r.actor_id,
      actorEmail: r.actor_email,
      oldData: r.old_data,
      newData: r.new_data,
      ipAddress: r.ip_address,
      userAgent: r.user_agent,
      createdAt: parseDbTime(r.created_at),
    })),
    total: count ?? 0,
  };
}

/** Distinct entity types / actions present (for filter dropdowns). */
export async function listAuditFacets(): Promise<{
  entityTypes: string[];
  actions: string[];
}> {
  // No aggregates over REST — sample recent rows and dedupe.
  const rows = await selectAll<{ entity_type: string; action: string }>(
    "audit_logs",
    { select: "entity_type,action", order: "created_at.desc", limit: 1000 },
  );
  return {
    entityTypes: Array.from(
      new Set(["user", "issue", "category", "tag", "auth", ...rows.map((r) => r.entity_type)]),
    ),
    actions: Array.from(new Set(rows.map((r) => r.action))).sort(),
  };
}
