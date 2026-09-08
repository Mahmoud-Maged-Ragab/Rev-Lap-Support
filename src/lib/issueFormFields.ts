/**
 * Canonical registry of the Issue Creation form's top-level fields. This is
 * the single source of truth for the drag-and-drop form builder AND the
 * fields actually rendered by `IssueForm` — the saved order/enabled state
 * (see `issueFormConfig.ts`) always resolves against this list, so a field
 * can never be dropped from the form just because it's absent/stale in a
 * saved config, and a newly added field always shows up (disabled) in the
 * builder instead of silently not existing.
 *
 * Deliberately isomorphic (no server-only imports) so both server pages and
 * client components (the builder UI) can import it.
 */

export const FIELD_KEYS = [
  "title",
  "subtitle",
  "description",
  "category",
  "tags",
  "images",
  "videos",
  "pdf",
  "documents",
] as const;

export type FieldKey = (typeof FIELD_KEYS)[number];

/**
 * A layout entry's `key` is either a built-in `FieldKey` or a custom
 * field's storage key, `custom:<issue_custom_fields.id>` — custom fields
 * are fully data-driven (see `src/lib/customFields.ts`), so the layout
 * can't restrict this to the static `FieldKey` union the way it used to.
 */
export type LayoutKey = string;

export const CUSTOM_FIELD_PREFIX = "custom:";

export function customFieldLayoutKey(customFieldId: string): LayoutKey {
  return `${CUSTOM_FIELD_PREFIX}${customFieldId}`;
}

export function isCustomFieldKey(key: LayoutKey): boolean {
  return key.startsWith(CUSTOM_FIELD_PREFIX);
}

export function customFieldIdFromKey(key: LayoutKey): string | null {
  return isCustomFieldKey(key) ? key.slice(CUSTOM_FIELD_PREFIX.length) : null;
}

export type FieldConfigEntry = {
  key: LayoutKey;
  enabled: boolean;
};

export const FIELD_REGISTRY: Record<
  FieldKey,
  { label: string; required: boolean; description?: string }
> = {
  title: { label: "Title", required: true },
  subtitle: { label: "Subtitle", required: false, description: "Short optional sub-heading" },
  description: { label: "Description", required: true },
  category: { label: "Category", required: false },
  tags: { label: "Tags", required: false },
  images: { label: "Images", required: false, description: "Multiple images, each with a caption" },
  videos: { label: "Videos", required: false, description: "Multiple videos, each with a caption" },
  pdf: { label: "PDF", required: false, description: "PDF attachments, rendered in-app" },
  documents: { label: "Documents", required: false, description: "Legacy .doc/.docx attachments" },
};

export function isFieldKey(v: unknown): v is FieldKey {
  return typeof v === "string" && (FIELD_KEYS as readonly string[]).includes(v);
}

/**
 * Whether a layout entry can never be disabled/removed from the form. Only
 * true for the two backend-required built-ins (title, description) — a
 * *custom* field's own `required` flag only governs validation while it's
 * enabled, it never blocks removing the field from the layout entirely
 * (see `src/lib/customFields.ts`).
 */
export function isRequiredField(key: LayoutKey): boolean {
  return isFieldKey(key) && FIELD_REGISTRY[key].required;
}

export const REQUIRED_FIELD_KEYS: FieldKey[] = FIELD_KEYS.filter(isRequiredField);

/** Default layout: matches the user-facing example order; `documents` starts disabled. */
export const DEFAULT_FIELD_CONFIG: FieldConfigEntry[] = [
  { key: "title", enabled: true },
  { key: "subtitle", enabled: true },
  { key: "description", enabled: true },
  { key: "category", enabled: true },
  { key: "tags", enabled: true },
  { key: "images", enabled: true },
  { key: "videos", enabled: true },
  { key: "pdf", enabled: true },
  { key: "documents", enabled: false },
];

/**
 * Reconcile a saved config against the current registry: drop unknown keys,
 * append any registry key missing from the saved config (disabled), dedupe,
 * and force every required field enabled. Keeps the builder/form working
 * correctly even if the registry gains/loses fields after a config was saved.
 */
export function reconcileFieldConfig(
  saved: FieldConfigEntry[] | null | undefined,
): FieldConfigEntry[] {
  if (!saved || saved.length === 0) return DEFAULT_FIELD_CONFIG;

  const seen = new Set<LayoutKey>();
  const out: FieldConfigEntry[] = [];
  for (const entry of saved) {
    const key = entry?.key;
    if (typeof key !== "string" || seen.has(key)) continue;
    // Keep any built-in key plus any custom:<id> key — custom field
    // existence/archival is validated against the DB at a higher layer
    // (IssueForm just skips rendering a stale custom key), not here.
    if (!isFieldKey(key) && !isCustomFieldKey(key)) continue;
    seen.add(key);
    out.push({
      key,
      enabled: isRequiredField(key) ? true : !!entry.enabled,
    });
  }
  for (const key of FIELD_KEYS) {
    if (!seen.has(key)) {
      out.push({ key, enabled: isRequiredField(key) });
    }
  }
  return out;
}

/** Derive the ordered list of keys that should actually be rendered. */
export function enabledFieldOrder(config: FieldConfigEntry[]): LayoutKey[] {
  return config.filter((f) => f.enabled).map((f) => f.key);
}

// ---------------------------------------------------------------------------
// Pure reorder/enable helpers, shared by the inline drag-and-drop UI on the
// Issue Creation/Edit form. Invariant maintained by all three: enabled
// entries always form the leading contiguous block of the returned array
// (in render order); disabled entries trail in arbitrary order. This keeps
// "enabled order" == "array prefix" so callers never have to reason about
// interleaving — see `enabledFieldOrder` above, which just takes the prefix.
// ---------------------------------------------------------------------------

export function reorderEnabledFields(
  entries: FieldConfigEntry[],
  activeKey: LayoutKey,
  overKey: LayoutKey,
): FieldConfigEntry[] {
  const enabled = entries.filter((e) => e.enabled);
  const disabled = entries.filter((e) => !e.enabled);
  const oldIndex = enabled.findIndex((e) => e.key === activeKey);
  const newIndex = enabled.findIndex((e) => e.key === overKey);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return entries;
  const reordered = [...enabled];
  const [moved] = reordered.splice(oldIndex, 1);
  reordered.splice(newIndex, 0, moved);
  return [...reordered, ...disabled];
}

export function moveEnabledField(
  entries: FieldConfigEntry[],
  key: LayoutKey,
  dir: -1 | 1,
): FieldConfigEntry[] {
  const enabled = entries.filter((e) => e.enabled);
  const disabled = entries.filter((e) => !e.enabled);
  const i = enabled.findIndex((e) => e.key === key);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= enabled.length) return entries;
  const next = [...enabled];
  [next[i], next[j]] = [next[j], next[i]];
  return [...next, ...disabled];
}

export function setFieldEnabled(
  entries: FieldConfigEntry[],
  key: LayoutKey,
  enabled: boolean,
): FieldConfigEntry[] {
  if (isRequiredField(key) && !enabled) return entries; // required fields can't be disabled
  const rest = entries.filter((e) => e.key !== key);
  const target = entries.find((e) => e.key === key) ?? { key, enabled: false };
  if (enabled) {
    const lastEnabledIdx = rest.reduce((acc, e, i) => (e.enabled ? i : acc), -1);
    const next = [...rest];
    next.splice(lastEnabledIdx + 1, 0, { ...target, enabled: true });
    return next;
  }
  if (!entries.find((e) => e.key === key)) return entries;
  return [...rest, { ...target, enabled: false }];
}

/** Insert a brand-new custom field's layout entry at the end of the enabled block (used right after creating one). */
export function addNewFieldEnabled(entries: FieldConfigEntry[], key: LayoutKey): FieldConfigEntry[] {
  return setFieldEnabled(entries, key, true);
}

/** Drop a layout entry entirely (used when a custom field is archived/deleted). */
export function removeFieldEntry(entries: FieldConfigEntry[], key: LayoutKey): FieldConfigEntry[] {
  return entries.filter((e) => e.key !== key);
}
