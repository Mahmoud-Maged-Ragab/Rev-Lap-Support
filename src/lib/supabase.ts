/**
 * Thin REST client for Supabase / PostgREST.
 *
 * All DB access goes through fetch() to the project's PostgREST endpoint.
 * Uses the service-role key — auth is enforced at the application layer
 * (see lib/auth.ts), not by Postgres RLS.
 */

const SUPABASE_URL = process.env.SUPABASE_URL!;

const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";

if (!SERVICE_KEY) {
  // Fail fast in dev — production deploys must set the env var.
  console.warn(
    "[supabase] SUPABASE_SERVICE_ROLE_KEY is not set. REST calls will fail.",
  );
}

const REST_URL = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1`;

function authHeaders(): Record<string, string> {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
  };
}

export class SupabaseError extends Error {
  status: number;
  code?: string;
  details?: unknown;
  constructor(
    message: string,
    status: number,
    code?: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "SupabaseError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function parseError(res: Response): Promise<SupabaseError> {
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    /* ignore */
  }
  return new SupabaseError(
    body?.message ?? res.statusText ?? "Supabase request failed",
    res.status,
    body?.code,
    body,
  );
}

/** Build a querystring from a record, skipping empty values. */
function qs(
  params: Record<string, string | number | undefined | null>,
): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.append(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export interface SelectOptions {
  /** PostgREST select string, e.g. "id,name" or "*,category:categories(*)". */
  select?: string;
  /** Raw filter pairs appended verbatim, e.g. { "id": "eq.123" } */
  filters?: Record<string, string>;
  /** "column.asc" / "column.desc" — multiple sorts comma-separated. */
  order?: string;
  limit?: number;
  offset?: number;
  /** Set to "exact" / "planned" / "estimated" to populate count. */
  count?: "exact" | "planned" | "estimated";
}

export interface SelectResult<T> {
  data: T[];
  count: number | null;
}

function rangeHeader(opts: {
  limit?: number;
  offset?: number;
}): Record<string, string> {
  if (opts.limit === undefined && opts.offset === undefined) return {};
  const from = opts.offset ?? 0;
  const to =
    opts.limit !== undefined ? from + Math.max(0, opts.limit - 1) : from + 999;
  return { Range: `${from}-${to}`, "Range-Unit": "items" };
}

export async function selectRows<T = any>(
  table: string,
  opts: SelectOptions = {},
): Promise<SelectResult<T>> {
  const params: Record<string, string> = {};
  if (opts.select) params["select"] = opts.select;
  if (opts.order) params["order"] = opts.order;
  if (opts.filters) Object.assign(params, opts.filters);

  // Use Range header for pagination so we can also request an exact count.
  const headers: Record<string, string> = { ...authHeaders() };
  Object.assign(
    headers,
    rangeHeader({ limit: opts.limit, offset: opts.offset }),
  );
  if (opts.count) headers["Prefer"] = `count=${opts.count}`;

  const url = `${REST_URL}/${table}${qs(params)}`;
  const res = await fetch(url, { method: "GET", headers, cache: "no-store" });
  if (!res.ok) throw await parseError(res);

  let count: number | null = null;
  if (opts.count) {
    const cr = res.headers.get("content-range");
    // Format: "0-9/57" or "*/57"
    const slash = cr?.split("/")[1];
    count = slash && slash !== "*" ? Number(slash) : null;
  }

  const data = (await res.json()) as T[];
  return { data, count };
}

/** Convenience: select with no pagination, returns just rows. */
export async function selectAll<T = any>(
  table: string,
  opts: Omit<SelectOptions, "count" | "limit" | "offset"> & {
    limit?: number;
  } = {},
): Promise<T[]> {
  const { data } = await selectRows<T>(table, opts);
  return data;
}

/** Returns first row or null. */
export async function selectOne<T = any>(
  table: string,
  opts: Omit<SelectOptions, "count" | "limit" | "offset"> = {},
): Promise<T | null> {
  const { data } = await selectRows<T>(table, { ...opts, limit: 1 });
  return data[0] ?? null;
}

export async function insertRow<T = any>(
  table: string,
  row: Record<string, unknown> | Record<string, unknown>[],
  opts: { select?: string; returning?: boolean } = {},
): Promise<T[]> {
  const headers: Record<string, string> = {
    ...authHeaders(),
    "Content-Type": "application/json",
    Prefer:
      opts.returning === false ? "return=minimal" : "return=representation",
  };
  const params: Record<string, string> = {};
  if (opts.select) params["select"] = opts.select;

  const url = `${REST_URL}/${table}${qs(params)}`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(row),
    cache: "no-store",
  });
  if (!res.ok) throw await parseError(res);
  if (opts.returning === false) return [];
  return (await res.json()) as T[];
}

export async function updateRows<T = any>(
  table: string,
  filters: Record<string, string>,
  patch: Record<string, unknown>,
  opts: { select?: string; returning?: boolean } = {},
): Promise<T[]> {
  const headers: Record<string, string> = {
    ...authHeaders(),
    "Content-Type": "application/json",
    Prefer:
      opts.returning === false ? "return=minimal" : "return=representation",
  };
  const params: Record<string, string> = { ...filters };
  if (opts.select) params["select"] = opts.select;

  const url = `${REST_URL}/${table}${qs(params)}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers,
    body: JSON.stringify(patch),
    cache: "no-store",
  });
  if (!res.ok) throw await parseError(res);
  if (opts.returning === false) return [];
  return (await res.json()) as T[];
}

export async function deleteRows<T = any>(
  table: string,
  filters: Record<string, string>,
  opts: { select?: string; returning?: boolean } = {},
): Promise<T[]> {
  const headers: Record<string, string> = {
    ...authHeaders(),
    Prefer:
      opts.returning === false ? "return=minimal" : "return=representation",
  };
  const params: Record<string, string> = { ...filters };
  if (opts.select) params["select"] = opts.select;

  const url = `${REST_URL}/${table}${qs(params)}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers,
    cache: "no-store",
  });
  if (!res.ok) throw await parseError(res);
  if (opts.returning === false) return [];
  return (await res.json()) as T[];
}

/** Quoted ilike pattern: escape commas, wrap in *q* for substring match. */
export function ilikePattern(q: string): string {
  // PostgREST treats commas and parens as separators inside `or=`, so escape them.
  const safe = q.replace(/[(),]/g, " ").trim();
  return `*${safe}*`;
}
