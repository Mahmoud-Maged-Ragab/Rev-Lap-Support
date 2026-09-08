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
import {
  normalizeTags,
  type AttachmentInput,
  type IssueInput,
  type SectionInput,
} from "./validation";
import { deleteAttachmentFiles, signPaths } from "./uploads";
import { generateId, nowIso } from "./ids";
import { loadIssueCustomFieldValues, replaceCustomFieldValues } from "./customFields";

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
  creator: { email: string; role: "ADMIN" | "Support" } | null;
};

export type IssueListResult = {
  items: IssueListItem[];
  total: number;
};

export type IssueAttachment = {
  id: string;
  kind: "image" | "video" | "pdf" | "document";
  url: string | null;
  storagePath: string;
  filename: string;
  mime: string;
  sizeBytes: number;
  caption: string | null;
  position: number;
};

export type IssueSection = {
  id: string;
  title: string;
  content: string;
  position: number;
  attachments: IssueAttachment[];
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
  subtitle: string | null;
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
  creator?: { email: string; role: "ADMIN" | "Support" } | null;
};

const ISSUE_LIST_SELECT =
  "id,title,slug,description,views,createdAt,updatedAt,category:categories(id,name),tags:issue_tags(tag:tags(id,name)),creator:admins(email,role)";

const ISSUE_FULL_SELECT =
  "id,title,slug,subtitle,description,errorMessage,solution,images,videoUrl,views,categoryId,createdAt,updatedAt,category:categories(id,name),tags:issue_tags(tag:tags(id,name))";


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
    creator: r.creator ? { email: r.creator.email, role: r.creator.role } : null,
  };
}

function mapIssueFull(r: IssueRow) {
  return {
    id: r.id,
    title: r.title,
    slug: r.slug,
    subtitle: r.subtitle,
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

// ---------------------------------------------------------------------------
// Sections + attachments
// ---------------------------------------------------------------------------

type SectionRow = {
  id: string;
  issueId: string;
  title: string;
  content: string;
  position: number;
};

type AttachmentRow = {
  id: string;
  issueId: string;
  sectionId: string | null;
  kind: "image" | "video" | "pdf" | "document";
  storagePath: string;
  filename: string;
  mime: string;
  sizeBytes: number;
  caption: string | null;
  position: number;
};

const SECTION_SELECT = "id,issueId,title,content,position";
const ATTACHMENT_SELECT =
  "id,issueId,sectionId,kind,storagePath,filename,mime,sizeBytes,caption,position";

/** Load sections + attachments for one issue, with freshly-signed URLs. */
async function loadSectionsAndAttachments(
  issueId: string,
): Promise<{ sections: IssueSection[]; attachments: IssueAttachment[] }> {
  const [sectionRows, attachmentRows] = await Promise.all([
    selectAll<SectionRow>("issue_sections", {
      select: SECTION_SELECT,
      filters: { issueId: `eq.${issueId}` },
      order: "position.asc",
    }),
    selectAll<AttachmentRow>("issue_attachments", {
      select: ATTACHMENT_SELECT,
      filters: { issueId: `eq.${issueId}` },
      order: "position.asc",
    }),
  ]);

  const urlByPath = await signPaths(attachmentRows.map((a) => a.storagePath));

  const toAttachment = (a: AttachmentRow): IssueAttachment => ({
    id: a.id,
    kind: a.kind,
    url: urlByPath[a.storagePath] ?? null,
    storagePath: a.storagePath,
    filename: a.filename,
    mime: a.mime,
    sizeBytes: a.sizeBytes,
    caption: a.caption,
    position: a.position,
  });

  const bySection = new Map<string, IssueAttachment[]>();
  const topLevel: IssueAttachment[] = [];
  for (const a of attachmentRows) {
    const mapped = toAttachment(a);
    if (a.sectionId) {
      const list = bySection.get(a.sectionId) ?? [];
      list.push(mapped);
      bySection.set(a.sectionId, list);
    } else {
      topLevel.push(mapped);
    }
  }

  const sections: IssueSection[] = sectionRows.map((s) => ({
    id: s.id,
    title: s.title,
    content: s.content,
    position: s.position,
    attachments: bySection.get(s.id) ?? [],
  }));

  return { sections, attachments: topLevel };
}

/**
 * Replace all sections/attachments for an issue with the given input
 * (mirrors the existing "delete then reinsert" pattern used for tags).
 * Storage objects that are no longer referenced are removed best-effort.
 */
async function replaceSectionsAndAttachments(
  issueId: string,
  sections: SectionInput[],
  topLevelAttachments: AttachmentInput[],
): Promise<void> {
  const existing = await selectAll<{ storagePath: string }>(
    "issue_attachments",
    { select: "storagePath", filters: { issueId: `eq.${issueId}` } },
  );

  await deleteRows(
    "issue_attachments",
    { issueId: `eq.${issueId}` },
    { returning: false },
  );
  await deleteRows(
    "issue_sections",
    { issueId: `eq.${issueId}` },
    { returning: false },
  );

  const sectionRowsToInsert = sections.map((s, i) => ({
    id: generateId(),
    issueId,
    title: s.title ?? "",
    content: s.content ?? "",
    position: i,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }));
  if (sectionRowsToInsert.length > 0) {
    await insertRow("issue_sections", sectionRowsToInsert, {
      returning: false,
    });
  }

  const attachmentRowsToInsert: Record<string, unknown>[] = [];
  topLevelAttachments.forEach((a, i) => {
    attachmentRowsToInsert.push({
      id: generateId(),
      issueId,
      sectionId: null,
      kind: a.kind,
      storagePath: a.storagePath,
      filename: a.filename,
      mime: a.mime,
      sizeBytes: a.sizeBytes,
      caption: a.caption ?? null,
      position: i,
      createdAt: nowIso(),
    });
  });
  sections.forEach((s, sIdx) => {
    const sectionId = sectionRowsToInsert[sIdx].id;
    (s.attachments ?? []).forEach((a, i) => {
      attachmentRowsToInsert.push({
        id: generateId(),
        issueId,
        sectionId,
        kind: a.kind,
        storagePath: a.storagePath,
        filename: a.filename,
        mime: a.mime,
        sizeBytes: a.sizeBytes,
        caption: a.caption ?? null,
        position: i,
        createdAt: nowIso(),
      });
    });
  });
  if (attachmentRowsToInsert.length > 0) {
    await insertRow("issue_attachments", attachmentRowsToInsert, {
      returning: false,
    });
  }

  const keptPaths = new Set(
    attachmentRowsToInsert.map((r) => r.storagePath as string),
  );
  const orphaned = existing
    .map((e) => e.storagePath)
    .filter((p) => !keptPaths.has(p));
  if (orphaned.length > 0) {
    await deleteAttachmentFiles(orphaned).catch(() => {});
  }
}

export async function getIssueBySlug(slug: string) {
  const row = await selectOne<IssueRow>("issues", {
    select: ISSUE_FULL_SELECT,
    filters: { slug: `eq.${slug}` },
  });
  if (!row) return null;
  const issue = mapIssueFull(row);
  const [{ sections, attachments }, customFields] = await Promise.all([
    loadSectionsAndAttachments(row.id),
    loadIssueCustomFieldValues(row.id),
  ]);
  return { ...issue, sections, attachments, customFields };
}

export async function getIssueById(id: string) {
  const row = await selectOne<IssueRow>("issues", {
    select: ISSUE_FULL_SELECT,
    filters: { id: `eq.${id}` },
  });
  if (!row) return null;
  const issue = mapIssueFull(row);
  const [{ sections, attachments }, customFields] = await Promise.all([
    loadSectionsAndAttachments(row.id),
    loadIssueCustomFieldValues(row.id),
  ]);
  return { ...issue, sections, attachments, customFields };
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

export async function createIssue(input: IssueInput, adminId?: string) {
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
      subtitle: input.subtitle ?? null,
      description: input.description,
      errorMessage: input.errorMessage ?? null,
      solution: input.solution,
      images: JSON.stringify(input.images ?? []),
      videoUrl: input.videoUrl ?? null,
      views: 0,
      categoryId: input.categoryId || null,
      admin_id: adminId ?? null,
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

  await Promise.all([
    replaceSectionsAndAttachments(id, input.sections ?? [], input.attachments ?? []),
    replaceCustomFieldValues(id, input.customFieldValues ?? []),
  ]);

  return inserted[0] ?? { id, slug };
}

export async function updateIssue(id: string, input: IssueInput) {
  const tagIds = await resolveTagIds(input);

  // `images` (legacy PDF-links) and `videoUrl` (legacy single video) predate
  // the sections/attachments system and are no longer sent by the current
  // authoring form. Only touch them when the caller explicitly provided a
  // value — otherwise leave whatever an old issue already has, instead of
  // wiping it to `[]`/`null` on every unrelated edit.
  const patch: Record<string, unknown> = {
    title: input.title,
    subtitle: input.subtitle ?? null,
    description: input.description,
    errorMessage: input.errorMessage ?? null,
    solution: input.solution,
    categoryId: input.categoryId || null,
    updatedAt: nowIso(),
  };
  if (input.images !== undefined) {
    patch.images = JSON.stringify(input.images);
  }
  if (input.videoUrl !== undefined) {
    patch.videoUrl = input.videoUrl;
  }

  const updated = await updateRows<{ id: string; slug: string }>(
    "issues",
    { id: `eq.${id}` },
    patch,
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

  await Promise.all([
    replaceSectionsAndAttachments(id, input.sections ?? [], input.attachments ?? []),
    replaceCustomFieldValues(id, input.customFieldValues ?? []),
  ]);

  return updated[0] ?? { id, slug: "" };
}

export async function deleteIssue(id: string) {
  const attachments = await selectAll<{ storagePath: string }>(
    "issue_attachments",
    { select: "storagePath", filters: { issueId: `eq.${id}` } },
  );

  // Remove join rows first in case there's no ON DELETE CASCADE wired up.
  await deleteRows("issue_tags", { issueId: `eq.${id}` }, { returning: false });
  await deleteRows(
    "issue_attachments",
    { issueId: `eq.${id}` },
    { returning: false },
  );
  await deleteRows(
    "issue_sections",
    { issueId: `eq.${id}` },
    { returning: false },
  );
  await deleteRows("issues", { id: `eq.${id}` }, { returning: false });

  await deleteAttachmentFiles(attachments.map((a) => a.storagePath)).catch(
    () => {},
  );
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
