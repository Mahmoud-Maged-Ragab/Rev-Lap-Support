import { deleteRows, insertRow, selectAll, selectOne, SupabaseError, updateRows } from "./supabase";
import { generateId, nowIso } from "./ids";
import type { CustomFieldInput, CustomFieldType } from "./validation";

/**
 * Data-driven custom fields for the Issue Creation form (see the drag-and-
 * drop builder in `IssueForm.tsx`). A field definition lives in
 * `issue_custom_fields`; the value entered for one on a given issue lives in
 * `issue_custom_field_values` (one row per issue+field). Deleting a field is
 * a soft delete (`archived = true`) — the definition and every historical
 * value are kept forever so removing/renaming a field can never destroy data
 * on issues that already used it (the DB's `on delete restrict` FK backs
 * this up at the schema level too). See supabase/sql/003_custom_fields.sql.
 */

export type CustomFieldDef = {
  id: string;
  name: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  placeholder: string | null;
  description: string | null;
  options: string[] | null;
  position: number;
  archived: boolean;
};

export type IssueCustomFieldValue = {
  fieldId: string;
  label: string;
  type: CustomFieldType;
  value: string | null;
};

const FIELD_SELECT =
  "id,name,label,type,required,placeholder,description,options,position,archived";

export async function listCustomFields(
  opts: { includeArchived?: boolean } = {},
): Promise<CustomFieldDef[]> {
  const filters: Record<string, string> = {};
  if (!opts.includeArchived) filters.archived = "eq.false";
  try {
    return await selectAll<CustomFieldDef>("issue_custom_fields", {
      select: FIELD_SELECT,
      filters,
      order: "position.asc",
    });
  } catch (err) {
    // Table not created yet (migration pending) — degrade to "no custom
    // fields" instead of breaking issue creation/viewing entirely.
    if (err instanceof SupabaseError) return [];
    throw err;
  }
}

export async function getCustomFieldById(id: string): Promise<CustomFieldDef | null> {
  return selectOne<CustomFieldDef>("issue_custom_fields", {
    select: FIELD_SELECT,
    filters: { id: `eq.${id}` },
  });
}

export async function createCustomField(input: CustomFieldInput): Promise<CustomFieldDef> {
  const existing = await selectAll<{ position: number }>("issue_custom_fields", {
    select: "position",
    order: "position.desc",
    limit: 1,
  });
  const position = (existing[0]?.position ?? -1) + 1;

  const id = generateId();
  const now = nowIso();
  const inserted = await insertRow<CustomFieldDef>(
    "issue_custom_fields",
    {
      id,
      name: input.name,
      label: input.label,
      type: input.type,
      required: input.required,
      placeholder: input.placeholder ?? null,
      description: input.description ?? null,
      options: input.options && input.options.length > 0 ? input.options : null,
      position,
      archived: false,
      createdAt: now,
      updatedAt: now,
    },
    { select: FIELD_SELECT },
  );
  return inserted[0];
}

export async function updateCustomField(
  id: string,
  input: CustomFieldInput,
): Promise<CustomFieldDef | null> {
  const updated = await updateRows<CustomFieldDef>(
    "issue_custom_fields",
    { id: `eq.${id}` },
    {
      name: input.name,
      label: input.label,
      type: input.type,
      required: input.required,
      placeholder: input.placeholder ?? null,
      description: input.description ?? null,
      options: input.options && input.options.length > 0 ? input.options : null,
      updatedAt: nowIso(),
    },
    { select: FIELD_SELECT },
  );
  return updated[0] ?? null;
}

/** Soft delete: hides the field from the builder/new issues but keeps the
 *  row and every historical value (the FK is `on delete restrict`, so a
 *  hard delete would fail anyway once a value references it). */
export async function archiveCustomField(id: string): Promise<void> {
  await updateRows(
    "issue_custom_fields",
    { id: `eq.${id}` },
    { archived: true, updatedAt: nowIso() },
    { returning: false },
  );
}

/** Values for one issue, joined with their (possibly archived) field
 *  definitions and sorted by field position — used for both the edit form
 *  prefill and the public issue-detail display. */
export async function loadIssueCustomFieldValues(
  issueId: string,
): Promise<IssueCustomFieldValue[]> {
  let rows: { fieldId: string; value: string | null }[];
  try {
    rows = await selectAll<{ fieldId: string; value: string | null }>(
      "issue_custom_field_values",
      { select: "fieldId,value", filters: { issueId: `eq.${issueId}` } },
    );
  } catch (err) {
    // Tables not created yet (migration pending) — degrade gracefully.
    if (err instanceof SupabaseError) return [];
    throw err;
  }
  if (rows.length === 0) return [];

  const fieldIds = Array.from(new Set(rows.map((r) => r.fieldId)));
  const fields = await selectAll<{ id: string; label: string; type: CustomFieldType; position: number }>(
    "issue_custom_fields",
    { select: "id,label,type,position", filters: { id: `in.(${fieldIds.join(",")})` } },
  );
  const byId = new Map(fields.map((f) => [f.id, f]));

  return rows
    .map((r) => {
      const f = byId.get(r.fieldId);
      if (!f) return null;
      return { fieldId: r.fieldId, label: f.label, type: f.type, value: r.value };
    })
    .filter((v): v is IssueCustomFieldValue & { position: number } => v !== null)
    .sort((a, b) => (byId.get(a.fieldId)?.position ?? 0) - (byId.get(b.fieldId)?.position ?? 0));
}

/** Delete-then-reinsert, same pattern as tags/sections elsewhere in this app. */
export async function replaceCustomFieldValues(
  issueId: string,
  values: { fieldId: string; value?: string | null }[],
): Promise<void> {
  await deleteRows("issue_custom_field_values", { issueId: `eq.${issueId}` }, { returning: false });

  const rows = values
    .filter((v) => v.value !== null && v.value !== undefined && v.value !== "")
    .map((v) => ({
      id: generateId(),
      issueId,
      fieldId: v.fieldId,
      value: v.value,
      createdAt: nowIso(),
    }));
  if (rows.length > 0) {
    await insertRow("issue_custom_field_values", rows, { returning: false });
  }
}

// ---------------------------------------------------------------------------
// Server-side validation — mirrors each field's `required`/type on submit so
// the client-side check in IssueForm isn't the only guard.
// ---------------------------------------------------------------------------

export function validateCustomFieldValues(
  fields: CustomFieldDef[],
  values: { fieldId: string; value?: string | null }[],
): { fieldId: string; message: string }[] {
  const valueByField = new Map(values.map((v) => [v.fieldId, v.value ?? ""]));
  const errors: { fieldId: string; message: string }[] = [];

  for (const field of fields) {
    const raw = (valueByField.get(field.id) ?? "").trim();

    if (field.required && raw === "") {
      errors.push({ fieldId: field.id, message: `${field.label} is required.` });
      continue;
    }
    if (raw === "") continue;

    switch (field.type) {
      case "number":
        if (Number.isNaN(Number(raw))) {
          errors.push({ fieldId: field.id, message: `${field.label} must be a number.` });
        }
        break;
      case "date":
        if (Number.isNaN(Date.parse(raw))) {
          errors.push({ fieldId: field.id, message: `${field.label} must be a valid date.` });
        }
        break;
      case "email":
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
          errors.push({ fieldId: field.id, message: `${field.label} must be a valid email.` });
        }
        break;
      case "url":
        try {
          new URL(raw);
        } catch {
          errors.push({ fieldId: field.id, message: `${field.label} must be a valid URL.` });
        }
        break;
      case "select":
      case "radio":
        if (field.options && field.options.length > 0 && !field.options.includes(raw)) {
          errors.push({ fieldId: field.id, message: `${field.label} has an invalid value.` });
        }
        break;
      case "multiselect": {
        if (!field.options || field.options.length === 0) break;
        try {
          const picked = JSON.parse(raw);
          if (
            !Array.isArray(picked) ||
            !picked.every((p) => typeof p === "string" && field.options!.includes(p))
          ) {
            errors.push({ fieldId: field.id, message: `${field.label} has an invalid value.` });
          }
        } catch {
          errors.push({ fieldId: field.id, message: `${field.label} has an invalid value.` });
        }
        break;
      }
      default:
        break;
    }
  }

  return errors;
}
