import { insertRow, selectOne, SupabaseError, updateRows } from "./supabase";
import {
  DEFAULT_FIELD_CONFIG,
  reconcileFieldConfig,
  type FieldConfigEntry,
} from "./issueFormFields";

/**
 * Persistence for the Issue Creation form builder's layout. One singleton
 * row (id = "default") holds the field order/enabled state as jsonb. Falls
 * back to the in-code defaults if the table doesn't exist yet (migration
 * not applied) or no row has been saved yet, so the app keeps working
 * either way — see supabase/sql/002_form_builder_pdf_subtitle.sql.
 */

const CONFIG_ID = "default";

type ConfigRow = {
  id: string;
  fields: FieldConfigEntry[];
};

export async function getIssueFormConfig(): Promise<FieldConfigEntry[]> {
  try {
    const row = await selectOne<ConfigRow>("issue_form_config", {
      select: "id,fields",
      filters: { id: `eq.${CONFIG_ID}` },
    });
    return reconcileFieldConfig(row?.fields ?? null);
  } catch (err) {
    // Table not created yet (migration pending) or any other read failure —
    // degrade to defaults rather than breaking issue creation.
    if (err instanceof SupabaseError) {
      return DEFAULT_FIELD_CONFIG;
    }
    throw err;
  }
}

export async function saveIssueFormConfig(
  fields: FieldConfigEntry[],
  updatedBy?: string,
): Promise<void> {
  const clean = reconcileFieldConfig(fields);
  const patch = {
    fields: clean,
    updatedAt: new Date().toISOString(),
    updatedBy: updatedBy ?? null,
  };

  const updated = await updateRows(
    "issue_form_config",
    { id: `eq.${CONFIG_ID}` },
    patch,
    { select: "id" },
  );
  if (updated.length > 0) return;

  await insertRow(
    "issue_form_config",
    { id: CONFIG_ID, ...patch },
    { returning: false },
  );
}
