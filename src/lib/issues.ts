import {
  deleteRows,
  ilikePattern,
  insertRow,
  selectAll,
  selectOne,
  selectRows,
  updateRows,
} from "./supabase";
import { slugify, uniqueSlug } from "./slug";
import { normalizeTags, type IssueInput } from "./validation";

export type IssueListItem = {
  id: string;
  title: string;
  slug: string;
  description: string;
  views: number;
  createdAt: Date;
  updatedAt: Date;
  category: { id: string; name: string } | null;
  tags: { id: string; name: string }[];
};

export type IssueListResult = {
  items: IssueListItem[];
  total: number;
};

export interface ListOptions {
  q?: string;
  categoryId?: string;
  tagId?: string;
  sort?: "newest" | "oldest" | "views";
  page?: number;
  pageSize?: number;
}

type IssueRow = {
  id: string;
  title: string;
  slug: string;
  description: string;
  errorMessage: string | null;
  solution: string;
  images: string;
  videoUrl: string | null;
  views: number;
  categoryId: string | null;
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string } | null;
  tags: { tag: { id: string; name: string } | null }[];
};

const ISSUE_LIST_SELECT =
  "id,title,slug,description,views,createdAt,updatedAt,category:categories(id,name),tags:issue_tags(tag:tags(id,name))";

const ISSUE_FULL_SELECT =
  "id,title,slug,description,errorMessage,solution,images,videoUrl,views,categoryId,createdAt,updatedAt,category:categories(id,name),tags:issue_tags(tag:tags(id,name))";

function generateId(): string {
  // cuid-shaped opaque string id: timestamp prefix + 16 hex chars of entropy.
  const ts = Date.now().toString(36);
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `c${ts}${rand}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Look up issue IDs that match category or tag name search (used by listIssues). */
async function relatedIssueIdsForSearch(
  q: string,
): Promise<{ categoryIds: string[]; issueIds: string[] }> {
  const pat = ilikePattern(q);

  const [cats, tagHits] = await Promise.all([
    selectAll<{ id: string }>("categories", {
      select: "id",
      filters: { name: `ilike.${pat}` },
    }),
    selectAll<{ id: string }>("tags", {
      select: "id",
      filters: { name: `ilike.${pat}` },
    }),
  ]);

  let issueIds: string[] = [];
  if (tagHits.length > 0) {
    const tagIdList = tagHits.map((t) => t.id).join(",");
    const join = await selectAll<{ issueId: string }>("issue_tags", {
      select: "issueId",
      filters: { tagId: `in.(${tagIdList})` },
    });
    issueIds = Array.from(new Set(join.map((j) => j.issueId)));
  }

  return { categoryIds: cats.map((c) => c.id), issueIds };
}

/** Look up issue IDs that have a specific tagId (used by listIssues tag filter). */
async function issueIdsForTag(tagId: string): Promise<string[]> {
  const rows = await selectAll<{ issueId: string }>("issue_tags", {
    select: "issueId",
    filters: { tagId: `eq.${tagId}` },
  });
  return Array.from(new Set(rows.map((r) => r.issueId)));
}

export async function listIssues(
  opts: ListOptions = {},
): Promise<IssueListResult> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? 20));
  const offset = (page - 1) * pageSize;

  const filters: Record<string, string> = {};

  // Tag filter: resolve to issue IDs first.
  if (opts.tagId) {
    const ids = await issueIdsForTag(opts.tagId);
    if (ids.length === 0) return { items: [], total: 0 };
    filters["id"] = `in.(${ids.join(",")})`;
  }

  if (opts.categoryId) {
    filters["categoryId"] = `eq.${opts.categoryId}`;
  }

  // Free-text search: main columns OR'd with related-table matches.
  if (opts.q && opts.q.trim()) {
    const q = opts.q.trim();
    const pat = ilikePattern(q);
    const orParts = [
      `title.ilike.${pat}`,
      `description.ilike.${pat}`,
      `errorMessage.ilike.${pat}`,
      `solution.ilike.${pat}`,
    ];

    const { categoryIds, issueIds } = await relatedIssueIdsForSearch(q);
    if (categoryIds.length > 0) {
      orParts.push(`categoryId.in.(${categoryIds.join(",")})`);
    }
    if (issueIds.length > 0) {
      orParts.push(`id.in.(${issueIds.join(",")})`);
    }
    filters["or"] = `(${orParts.join(",")})`;
  }

  const order =
    opts.sort === "views"
      ? "views.desc"
      : opts.sort === "oldest"
        ? "createdAt.asc"
        : "createdAt.desc";

  const { data, count } = await selectRows<IssueRow>("issues", {
    select: ISSUE_LIST_SELECT,
    filters,
    order,
    limit: pageSize,
    offset,
    count: "exact",
  });

  return {
    items: data.map(mapIssueListItem),
    total: count ?? 0,
  };
}

function mapIssueListItem(r: IssueRow): IssueListItem {
  return {
    id: r.id,
    title: r.title,
    slug: r.slug,
    description: r.description,
    views: r.views,
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt),
    category: r.category ? { id: r.category.id, name: r.category.name } : null,
    tags: (r.tags ?? [])
      .map((t) => t.tag)
      .filter((t): t is { id: string; name: string } => !!t)
      .map((t) => ({ id: t.id, name: t.name })),
  };
}

function mapIssueFull(r: IssueRow) {
  return {
    id: r.id,
    title: r.title,
    slug: r.slug,
    description: r.description,
    errorMessage: r.errorMessage,
    solution: r.solution,
    videoUrl: r.videoUrl,
    views: r.views,
    categoryId: r.categoryId,
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt),
    images: safeParseImages(r.images),
    category: r.category ? { id: r.category.id, name: r.category.name } : null,
    tags: (r.tags ?? [])
      .map((t) => t.tag)
      .filter((t): t is { id: string; name: string } => !!t)
      .map((t) => ({ id: t.id, name: t.name })),
  };
}

export async function getIssueBySlug(slug: string) {
  const row = await selectOne<IssueRow>("issues", {
    select: ISSUE_FULL_SELECT,
    filters: { slug: `eq.${slug}` },
  });
  return row ? mapIssueFull(row) : null;
}

export async function getIssueById(id: string) {
  const row = await selectOne<IssueRow>("issues", {
    select: ISSUE_FULL_SELECT,
    filters: { id: `eq.${id}` },
  });
  return row ? mapIssueFull(row) : null;
}

export async function incrementViews(id: string) {
  // PostgREST has no atomic increment without an RPC; read-then-write.
  const row = await selectOne<{ views: number }>("issues", {
    select: "views",
    filters: { id: `eq.${id}` },
  });
  if (!row) return;
  await updateRows(
    "issues",
    { id: `eq.${id}` },
    { views: (row.views ?? 0) + 1 },
    { returning: false },
  );
}

async function resolveTagIds(input: IssueInput): Promise<string[]> {
  if (input.tagIds && input.tagIds.length > 0) {
    const ids = Array.from(new Set(input.tagIds));
    const found = await selectAll<{ id: string }>("tags", {
      select: "id",
      filters: { id: `in.(${ids.join(",")})` },
    });
    const valid = new Set(found.map((t) => t.id));
    return ids.filter((id) => valid.has(id));
  }

  const tagNames = normalizeTags(input.tags);
  if (tagNames.length === 0) return [];

  // Upsert each name (look up; insert if missing).
  const out: string[] = [];
  for (const name of tagNames) {
    const existing = await selectOne<{ id: string }>("tags", {
      select: "id",
      filters: { name: `eq.${name}` },
    });
    if (existing) {
      out.push(existing.id);
      continue;
    }
    const created = await insertRow<{ id: string }>(
      "tags",
      { id: generateId(), name },
      { select: "id" },
    );
    if (created[0]?.id) out.push(created[0].id);
  }
  return out;
}

export async function createIssue(input: IssueInput) {
  const tagIds = await resolveTagIds(input);

  const slug = await uniqueSlug(input.title, async (s) => {
    const found = await selectOne<{ id: string }>("issues", {
      select: "id",
      filters: { slug: `eq.${s}` },
    });
    return !!found;
  });

  const id = generateId();
  const now = nowIso();
  const inserted = await insertRow<{ id: string; slug: string }>(
    "issues",
    {
      id,
      title: input.title,
      slug,
      description: input.description,
      errorMessage: input.errorMessage ?? null,
      solution: input.solution,
      images: JSON.stringify(input.images ?? []),
      videoUrl: input.videoUrl ?? null,
      views: 0,
      categoryId: input.categoryId || null,
      createdAt: now,
      updatedAt: now,
    },
    { select: "id,slug" },
  );

  if (tagIds.length > 0) {
    await insertRow(
      "issue_tags",
      tagIds.map((tagId) => ({ id: generateId(), issueId: id, tagId })),
      { returning: false },
    );
  }

  return inserted[0] ?? { id, slug };
}

export async function updateIssue(id: string, input: IssueInput) {
  const tagIds = await resolveTagIds(input);

  const updated = await updateRows<{ id: string; slug: string }>(
    "issues",
    { id: `eq.${id}` },
    {
      title: input.title,
      description: input.description,
      errorMessage: input.errorMessage ?? null,
      solution: input.solution,
      images: JSON.stringify(input.images ?? []),
      videoUrl: input.videoUrl ?? null,
      categoryId: input.categoryId || null,
      updatedAt: nowIso(),
    },
    { select: "id,slug" },
  );

  // Replace tag links.
  await deleteRows("issue_tags", { issueId: `eq.${id}` }, { returning: false });
  if (tagIds.length > 0) {
    await insertRow(
      "issue_tags",
      tagIds.map((tagId) => ({ id: generateId(), issueId: id, tagId })),
      { returning: false },
    );
  }

  return updated[0] ?? { id, slug: "" };
}

export async function deleteIssue(id: string) {
  // Remove join rows first in case there's no ON DELETE CASCADE wired up.
  await deleteRows("issue_tags", { issueId: `eq.${id}` }, { returning: false });
  await deleteRows("issues", { id: `eq.${id}` }, { returning: false });
}

function safeParseImages(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export { slugify, generateId };
