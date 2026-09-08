import { z } from "zod";
import { FIELD_KEYS, REQUIRED_FIELD_KEYS } from "./issueFormFields";

export const LoginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
});

export const AttachmentKindSchema = z.enum(["image", "video", "pdf", "document"]);
export type AttachmentKind = z.infer<typeof AttachmentKindSchema>;

/**
 * One uploaded file, already sitting in storage (see POST /api/upload) by
 * the time it's referenced here. `id` is present when this is an existing
 * attachment being kept across an edit; omitted for a newly uploaded one.
 */
export const AttachmentInputSchema = z.object({
  id: z.string().optional(),
  kind: AttachmentKindSchema,
  storagePath: z.string().min(1).max(500),
  filename: z.string().min(1).max(255),
  mime: z.string().min(1).max(150),
  sizeBytes: z.number().int().min(0).max(200 * 1024 * 1024),
  caption: z
    .string()
    .max(500)
    .optional()
    .nullable()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
});
export type AttachmentInput = z.infer<typeof AttachmentInputSchema>;

/** A section groups a title + description with its own attachments. */
export const SectionInputSchema = z.object({
  id: z.string().optional(),
  title: z.string().max(200).optional().default(""),
  content: z.string().max(10_000).optional().default(""),
  attachments: z.array(AttachmentInputSchema).max(30).optional().default([]),
});
export type SectionInput = z.infer<typeof SectionInputSchema>;

export const IssueInputSchema = z.object({
  title: z.string().min(3).max(200),
  subtitle: z
    .string()
    .max(300)
    .optional()
    .nullable()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  description: z.string().min(5).max(10_000),
  errorMessage: z.string().max(5_000).optional().nullable(),
  // Legacy required field — sections now carry the "solution" content for
  // new issues, so this is optional going forward. Existing rows keep
  // whatever they had.
  solution: z.string().max(20_000).optional().default(""),
  categoryId: z.string().optional().nullable(),
  // Accept either a comma string or array of tag NAMES (legacy)
  tags: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .default([]),
  // Preferred: array of existing tag IDs
  tagIds: z.array(z.string().min(1)).max(50).optional(),
  // No `.default([])` here on purpose: `updateIssue` needs to distinguish
  // "the client omitted this legacy field" (undefined — leave the existing
  // DB value alone) from "the client explicitly sent an empty array".
  images: z.array(z.string().url()).max(20).optional(),
  videoUrl: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z
      .string()
      .refine(
        (val) => val.startsWith("/uploads/") || /^https?:\/\//.test(val),
        {
          message: "Invalid url",
        },
      )
      .nullable()
      .optional(),
  ),
  // Simple-mode attachments: attached directly to the issue, no section.
  attachments: z.array(AttachmentInputSchema).max(30).optional().default([]),
  // Detailed-mode: user-organized content sections, each with its own
  // attachments. Optional — a "quick" issue has none.
  sections: z.array(SectionInputSchema).max(30).optional().default([]),
  // Values entered into data-driven custom fields (see lib/customFields.ts).
  // `fieldId` references `issue_custom_fields.id`; required/type validation
  // against the live field definitions happens server-side in the route
  // handler (can't be expressed statically here since fields are DB-driven).
  customFieldValues: z
    .array(
      z.object({
        fieldId: z.string().min(1).max(64),
        value: z.string().max(5_000).optional().nullable(),
      }),
    )
    .max(50)
    .optional()
    .default([]),
});

export type IssueInput = z.infer<typeof IssueInputSchema>;

export const AdminInputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(8).max(200),
  // Accepted case-insensitively; the route canonicalizes via normalizeRole and
  // enforces who may assign which role (see lib/permissions). Defaults to the
  // least-privileged role when omitted.
  role: z.string().max(40).optional(),
});

export const CategoryInputSchema = z.object({
  name: z.string().min(2).max(80),
});

export const TagInputSchema = z.object({
  name: z.string().min(1).max(40),
});

/** A layout entry's key is either a built-in FieldKey or `custom:<uuid-ish id>`
 *  — see lib/issueFormFields.ts's CUSTOM_FIELD_PREFIX. */
const LayoutKeySchema = z
  .string()
  .min(1)
  .max(100)
  .refine(
    (v) => (FIELD_KEYS as readonly string[]).includes(v) || /^custom:[\w-]{1,80}$/.test(v),
    { message: "Invalid field key" },
  );

/** The drag-and-drop form builder's saved layout: order + enabled state. */
export const IssueFormConfigSchema = z
  .array(
    z.object({
      key: LayoutKeySchema,
      enabled: z.boolean(),
    }),
  )
  .min(1)
  .max(200)
  .refine(
    (entries) => new Set(entries.map((e) => e.key)).size === entries.length,
    { message: "Duplicate field keys" },
  )
  .refine(
    (entries) =>
      REQUIRED_FIELD_KEYS.every(
        (key) => entries.find((e) => e.key === key)?.enabled === true,
      ),
    { message: "Required fields cannot be disabled" },
  );

// ---------------------------------------------------------------------------
// Custom fields (data-driven — see lib/customFields.ts)
// ---------------------------------------------------------------------------

export const CustomFieldTypeSchema = z.enum([
  "text",
  "textarea",
  "number",
  "date",
  "select",
  "checkbox",
  "radio",
  "url",
  "email",
  "phone",
  "multiselect",
]);
export type CustomFieldType = z.infer<typeof CustomFieldTypeSchema>;

const OPTION_TYPES = new Set(["select", "radio", "multiselect"]);

export const CustomFieldInputSchema = z
  .object({
    // Machine key — lowercase snake_case, stable identifier separate from
    // the editable display label.
    name: z
      .string()
      .trim()
      .min(1)
      .max(60)
      .regex(/^[a-z][a-z0-9_]*$/, "Use lowercase letters, numbers, and underscores only"),
    label: z.string().trim().min(1).max(100),
    type: CustomFieldTypeSchema,
    required: z.boolean().default(false),
    placeholder: z
      .string()
      .max(200)
      .optional()
      .nullable()
      .transform((v) => (v && v.trim() ? v.trim() : null)),
    description: z
      .string()
      .max(500)
      .optional()
      .nullable()
      .transform((v) => (v && v.trim() ? v.trim() : null)),
    options: z.array(z.string().trim().min(1).max(100)).max(50).optional().nullable(),
  })
  .refine((v) => !OPTION_TYPES.has(v.type) || (v.options && v.options.length > 0), {
    message: "This field type needs at least one option",
    path: ["options"],
  });
export type CustomFieldInput = z.infer<typeof CustomFieldInputSchema>;

export function normalizeTags(tags: string | string[] | undefined): string[] {
  if (!tags) return [];
  const arr = Array.isArray(tags) ? tags : tags.split(",");
  return Array.from(
    new Set(
      arr
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0 && t.length <= 40),
    ),
  ).slice(0, 20);
}
