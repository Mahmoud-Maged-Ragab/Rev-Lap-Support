/**
 * Issue history: logging, querying, and activity aggregation.
 *
 * Backed by the existing Supabase `issue_history` table (all-lowercase
 * columns): id, issueid, adminid, action, changes, olddata, newdata,
 * createdat. `createdat` is a UTC timestamp WITHOUT a timezone suffix and
 * defaults to now() server-side.
 *
 * PostgREST aggregates are disabled on this project, so activity stats are
 * aggregated here in the server layer from compact (adminid, action,
 * createdat, issueid) rows — never in the browser.
 *
 * NOTE: issue_history.issueid has ON DELETE CASCADE — deleting an issue
 * removes its entire history, so "delete" actions cannot be retained under
 * the current schema. The UI still renders unknown/extra action types if
 * that constraint is ever relaxed.
 */

import {
  ilikePattern,
  insertRow,
  selectAll,
  selectRows,
} from "./supabase";
import { generateId } from "./issues";
import type { IssueInput } from "./validation";

export type HistoryAction = "create" | "update" | "delete";

/** One changed field: old and new rendered as short display strings. */
export type FieldChange = {
  field: string;
  old: string | null;
  new: string | null;
};

export type HistoryEntry = {
  id: string;
  issueId: string;
  action: string;
  changes: string | null;
  oldData: Record<string, string | null> | null;
  newData: Record<string, string | null> | null;
  createdAt: Date;
  issue: { id: string; title: string; slug: string } | null;
  admin: { id: string; email: string; role: string } | null;
};

export type HistoryListResult = {
  items: HistoryEntry[];
  total: number;
};

export interface HistoryListOptions {
  /** Free text: matches issue title, exact issue id, or admin email. */
  q?: string;
  action?: string;
  adminId?: string;
  /** ISO date (yyyy-mm-dd), inclusive. */
  from?: string;
  /** ISO date (yyyy-mm-dd), inclusive. */
  to?: string;
  page?: number;
  pageSize?: number;
}

/** DB timestamps come back without a timezone suffix but are UTC. */
export function parseDbTime(v: string): Date {
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(v) ? v : `${v}Z`);
}

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

const DIFF_VALUE_MAX = 400;

function clip(v: string | null | undefined): string | null {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v);
  return s.length > DIFF_VALUE_MAX ? `${s.slice(0, DIFF_VALUE_MAX)}…` : s;
}

/**
 * Diff an existing issue against incoming input. Returns only changed fields,
 * with values clipped for storage. `tagNames` maps tag id → name so the diff
 * shows names rather than opaque ids.
 */
export function computeIssueChanges(
  before: {
    title: string;
    description: string;
    errorMessage: string | null;
    solution: string;
    categoryId: string | null;
    videoUrl: string | null;
    images: string[];
    tags: { id: string; name: string }[];
  },
  input: IssueInput,
  opts: {
    categoryNames?: Record<string, string>;
    tagNames?: Record<string, string>;
  } = {},
): FieldChange[] {
  const out: FieldChange[] = [];
  const push = (
    field: string,
    oldV: string | null | undefined,
    newV: string | null | undefined,
  ) => {
    const o = clip(oldV);
    const n = clip(newV);
    if (o !== n) out.push({ field, old: o, new: n });
  };

  push("title", before.title, input.title);
  push("description", before.description, input.description);
  push("errorMessage", before.errorMessage, input.errorMessage ?? null);
  push("solution", before.solution, input.solution);
  push("videoUrl", before.videoUrl, input.videoUrl ?? null);

  const catName = (id: string | null | undefined) =>
    id ? (opts.categoryNames?.[id] ?? id) : null;
  push("category", catName(before.categoryId), catName(input.categoryId));

  const imgOld = before.images.join(", ");
  const imgNew = (input.images ?? []).join(", ");
  push("images", imgOld || null, imgNew || null);

  if (input.tagIds) {
    const oldIds = before.tags.map((t) => t.id).sort();
    const newIds = [...new Set(input.tagIds)].sort();
    if (oldIds.join(",") !== newIds.join(",")) {
      const name = (id: string) => opts.tagNames?.[id] ?? id;
      push(
        "tags",
        before.tags.map((t) => t.name).sort().join(", ") || null,
        newIds.map(name).sort().join(", ") || null,
      );
    }
  }

  return out;
}

/**
 * Insert a history record. Never throws — history must not break issue CRUD.
 */
export async function logIssueHistory(entry: {
  issueId: string;
  adminId: string | null;
  action: HistoryAction;
  changes?: FieldChange[];
  /** Full snapshot for "create" (goes to newdata). */
  snapshot?: Record<string, unknown>;
}): Promise<void> {
  try {
    const changed = entry.changes ?? [];
    const olddata: Record<string, string | null> = {};
    const newdata: Record<string, string | null> = {};
    for (const c of changed) {
      olddata[c.field] = c.old;
      newdata[c.field] = c.new;
    }
    await insertRow(
      "issue_history",
      {
        id: generateId(),
        issueid: entry.issueId,
        adminid: entry.adminId,
        action: entry.action,
        changes:
          changed.length > 0
            ? changed.map((c) => c.field).join(", ")
            : entry.action,
        olddata: changed.length > 0 ? olddata : null,
        newdata:
          changed.length > 0
            ? newdata
            : entry.snapshot
              ? Object.fromEntries(
                  Object.entries(entry.snapshot).map(([k, v]) => [
                    k,
                    clip(v == null ? null : String(v)),
                  ]),
                )
              : null,
      },
      { returning: false },
    );
  } catch (err) {
    console.error("[history] failed to log issue history", err);
  }
}

// ---------------------------------------------------------------------------
// History listing (search / filter / pagination)
// ---------------------------------------------------------------------------

type HistoryRow = {
  id: string;
  issueid: string;
  action: string;
  changes: string | null;
  olddata: Record<string, string | null> | null;
  newdata: Record<string, string | null> | null;
  createdat: string;
  issue: { id: string; title: string; slug: string } | null;
  admin: { id: string; email: string; role: string } | null;
};

const HISTORY_SELECT =
  "id,issueid,action,changes,olddata,newdata,createdat,issue:issues(id,title,slug),admin:admins(id,email,role)";

export async function listHistory(
  opts: HistoryListOptions = {},
): Promise<HistoryListResult> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? 20));

  const filters: Record<string, string> = {};

  if (opts.action) filters["action"] = `eq.${opts.action}`;
  if (opts.adminId) filters["adminid"] = `eq.${opts.adminId}`;
  if (opts.from) filters["createdat"] = `gte.${opts.from}T00:00:00`;
  if (opts.to) {
    // Inclusive end date → strictly before the next day. PostgREST allows
    // only one raw filter per key, so combine via and=() when both are set.
    const next = new Date(`${opts.to}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    const lt = `lt.${next.toISOString().slice(0, 10)}T00:00:00`;
    if (filters["createdat"]) {
      filters["and"] = `(createdat.${filters["createdat"]},createdat.${lt})`;
      delete filters["createdat"];
    } else {
      filters["createdat"] = lt;
    }
  }

  // Free-text search resolves to issue/admin id sets first (PostgREST cannot
  // filter on embedded columns directly).
  if (opts.q && opts.q.trim()) {
    const q = opts.q.trim();
    const pat = ilikePattern(q);
    const [issueHits, adminHits] = await Promise.all([
      selectAll<{ id: string }>("issues", {
        select: "id",
        filters: { or: `(title.ilike.${pat},id.eq.${q})` },
        limit: 500,
      }),
      selectAll<{ id: string }>("admins", {
        select: "id",
        filters: { email: `ilike.${pat}` },
        limit: 500,
      }),
    ]);
    const orParts: string[] = [];
    if (issueHits.length > 0)
      orParts.push(`issueid.in.(${issueHits.map((r) => r.id).join(",")})`);
    if (adminHits.length > 0)
      orParts.push(`adminid.in.(${adminHits.map((r) => r.id).join(",")})`);
    if (orParts.length === 0) return { items: [], total: 0 };
    filters["or"] = `(${orParts.join(",")})`;
  }

  const { data, count } = await selectRows<HistoryRow>("issue_history", {
    select: HISTORY_SELECT,
    filters,
    order: "createdat.desc",
    limit: pageSize,
    offset: (page - 1) * pageSize,
    count: "exact",
  });

  return {
    items: data.map((r) => ({
      id: r.id,
      issueId: r.issueid,
      action: r.action,
      changes: r.changes,
      oldData: r.olddata,
      newData: r.newdata,
      createdAt: parseDbTime(r.createdat),
      issue: r.issue,
      admin: r.admin,
    })),
    total: count ?? 0,
  };
}

/** Distinct actions present in the table (for the filter dropdown). */
export async function listHistoryActions(): Promise<string[]> {
  // No aggregates over REST — sample recent rows and dedupe. Always offer
  // the canonical actions even before any records exist.
  const rows = await selectAll<{ action: string }>("issue_history", {
    select: "action",
    order: "createdat.desc",
    limit: 1000,
  });
  return Array.from(new Set(["create", "update", ...rows.map((r) => r.action)]));
}

// ---------------------------------------------------------------------------
// Activity aggregation (server-side)
// ---------------------------------------------------------------------------

export type UserActivity = {
  id: string;
  email: string;
  role: string;
  created: number;
  edited: number;
  lastActivity: Date | null;
  lastCreated: { id: string; title: string; slug: string } | null;
  lastEdited: { id: string; title: string; slug: string } | null;
};

export type DayCount = { date: Date; created: number; edited: number };

export type ActivityStats = {
  createdToday: number;
  updatedToday: number;
  mostActiveUser: UserActivity | null;
  mostActiveAdmin: UserActivity | null;
  topCreators: UserActivity[];
  topEditors: UserActivity[];
  users: UserActivity[];
  /** Daily created/edited counts for the last 30 days, oldest first. */
  perDay: DayCount[];
  totalEvents: number;
};

type CompactRow = {
  issueid: string;
  adminid: string | null;
  action: string;
  createdat: string;
};

/**
 * Fetch compact history rows in chunks. Minimal columns, bounded at
 * `maxRows` — with per-field-clipped payloads this comfortably covers years
 * of activity while keeping memory flat.
 */
async function fetchCompactHistory(maxRows = 20_000): Promise<CompactRow[]> {
  const chunk = 1000;
  const out: CompactRow[] = [];
  for (let offset = 0; offset < maxRows; offset += chunk) {
    const { data } = await selectRows<CompactRow>("issue_history", {
      select: "issueid,adminid,action,createdat",
      order: "createdat.desc",
      limit: chunk,
      offset,
    });
    out.push(...data);
    if (data.length < chunk) break;
  }
  return out;
}

function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Build all dashboard activity statistics from issue_history in one pass.
 * `accounts` are the already-fetched admin rows (no duplicate query).
 */
export async function getActivityStats(
  accounts: { id: string; email: string; role: string }[],
  opts: { days?: number } = {},
): Promise<ActivityStats> {
  const days = opts.days ?? 30;
  const rows = await fetchCompactHistory();

  const now = new Date();
  const todayKey = localDayKey(now);
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - (days - 1));
  windowStart.setHours(0, 0, 0, 0);

  // Per-day buckets, oldest first.
  const dayIndex = new Map<string, DayCount>();
  const perDay: DayCount[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(windowStart);
    d.setDate(windowStart.getDate() + i);
    const bucket: DayCount = { date: d, created: 0, edited: 0 };
    dayIndex.set(localDayKey(d), bucket);
    perDay.push(bucket);
  }

  type Acc = {
    created: number;
    edited: number;
    last: Date | null;
    lastCreatedIssue: string | null;
    lastEditedIssue: string | null;
  };
  const byAdmin = new Map<string, Acc>();
  const acc = (id: string): Acc => {
    let a = byAdmin.get(id);
    if (!a) {
      a = {
        created: 0,
        edited: 0,
        last: null,
        lastCreatedIssue: null,
        lastEditedIssue: null,
      };
      byAdmin.set(id, a);
    }
    return a;
  };

  let createdToday = 0;
  let updatedToday = 0;

  // Rows arrive newest-first, so the first hit per admin+action is the latest.
  for (const r of rows) {
    const at = parseDbTime(r.createdat);
    const key = localDayKey(at);
    const isCreate = r.action === "create";
    const isUpdate = r.action === "update";

    if (key === todayKey) {
      if (isCreate) createdToday++;
      if (isUpdate) updatedToday++;
    }
    const bucket = dayIndex.get(key);
    if (bucket) {
      if (isCreate) bucket.created++;
      if (isUpdate) bucket.edited++;
    }
    if (r.adminid) {
      const a = acc(r.adminid);
      if (isCreate) {
        a.created++;
        if (!a.lastCreatedIssue) a.lastCreatedIssue = r.issueid;
      }
      if (isUpdate) {
        a.edited++;
        if (!a.lastEditedIssue) a.lastEditedIssue = r.issueid;
      }
      if (!a.last) a.last = at;
    }
  }

  // Resolve "last issue" titles in one batched query.
  const issueIds = new Set<string>();
  for (const a of byAdmin.values()) {
    if (a.lastCreatedIssue) issueIds.add(a.lastCreatedIssue);
    if (a.lastEditedIssue) issueIds.add(a.lastEditedIssue);
  }
  const issueMap = new Map<string, { id: string; title: string; slug: string }>();
  if (issueIds.size > 0) {
    const found = await selectAll<{ id: string; title: string; slug: string }>(
      "issues",
      {
        select: "id,title,slug",
        filters: { id: `in.(${Array.from(issueIds).join(",")})` },
      },
    );
    for (const i of found) issueMap.set(i.id, i);
  }

  const users: UserActivity[] = accounts.map((u) => {
    const a = byAdmin.get(u.id);
    return {
      id: u.id,
      email: u.email,
      role: u.role,
      created: a?.created ?? 0,
      edited: a?.edited ?? 0,
      lastActivity: a?.last ?? null,
      lastCreated: a?.lastCreatedIssue
        ? (issueMap.get(a.lastCreatedIssue) ?? null)
        : null,
      lastEdited: a?.lastEditedIssue
        ? (issueMap.get(a.lastEditedIssue) ?? null)
        : null,
    };
  });

  const byTotal = [...users].sort(
    (a, b) => b.created + b.edited - (a.created + a.edited),
  );
  const active = byTotal.filter((u) => u.created + u.edited > 0);
  const admins = active.filter(
    (u) => u.role.toUpperCase() === "ADMIN" || u.role.toUpperCase() === "OWNER",
  );

  return {
    createdToday,
    updatedToday,
    mostActiveUser: active[0] ?? null,
    mostActiveAdmin: admins[0] ?? null,
    topCreators: [...users]
      .filter((u) => u.created > 0)
      .sort((a, b) => b.created - a.created)
      .slice(0, 5),
    topEditors: [...users]
      .filter((u) => u.edited > 0)
      .sort((a, b) => b.edited - a.edited)
      .slice(0, 5),
    users,
    perDay,
    totalEvents: rows.length,
  };
}

/** The newest history entries with issue/admin context (for the timeline). */
export async function listRecentActivity(limit = 10): Promise<HistoryEntry[]> {
  const { items } = await listHistory({ page: 1, pageSize: limit });
  return items;
}
