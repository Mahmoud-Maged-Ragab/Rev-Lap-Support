import { z } from "zod";
import { FIELD_KEYS, REQUIRED_FIELD_KEYS } from "./issueFormFields";
import { isGoogleDriveUrl } from "./googleDrive";

export const LoginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
});

export const AttachmentKindSchema = z.enum(["image", "video", "pdf", "document"]);
export type AttachmentKind = z.infer<typeof AttachmentKindSchema>;

export const AttachmentSourceSchema = z.enum(["upload", "drive"]);
export type AttachmentSource = z.infer<typeof AttachmentSourceSchema>;

/**
 * One attachment, either already sitting in storage (see POST /api/upload)
 * or a Google Drive link (`source: "drive"`, no storagePath — see
 * lib/googleDrive.ts). `id` is present when this is an existing attachment
 * being kept across an edit; omitted for a newly added one.
 */
export const AttachmentInputSchema = z
  .object({
    id: z.string().optional(),
    kind: AttachmentKindSchema,
    source: AttachmentSourceSchema.optional().default("upload"),
    storagePath: z.string().min(1).max(500).optional().nullable(),
    externalUrl: z.string().max(2000).optional().nullable(),
    filename: z.string().min(1).max(255),
    mime: z.string().min(1).max(150),
    sizeBytes: z.number().int().min(0).max(200 * 1024 * 1024),
    caption: z
      .string()
      .max(500)
      .optional()
      .nullable()
      .transform((v) => (v && v.trim() ? v.trim() : null)),
  })
  .superRefine((v, ctx) => {
    if (v.source === "upload") {
      if (!v.storagePath) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "storagePath is required for uploaded attachments",
          path: ["storagePath"],
        });
      }
    } else if (v.source === "drive") {
      if (!v.externalUrl || !isGoogleDriveUrl(v.externalUrl)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "externalUrl must be a valid Google Drive share link",
          path: ["externalUrl"],
        });
      }
      if (
        v.kind !== "image" &&
        v.kind !== "video" &&
        v.kind !== "pdf" &&
        v.kind !== "document"
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Google Drive links are only supported for image, video, pdf, and document attachments",
          path: ["kind"],
        });
      }
    }
  });
export type AttachmentInput = z.infer<typeof AttachmentInputSchema>;

/**
 * `"legacy"` is a free-form title + description + mixed attachments block
 * (the original Sections feature). Every other value is a single-purpose
 * content element added via the Issue Builder's "Add Element" menu — see
 * lib/sectionElements.ts for what each one actually uses (title vs. content
 * vs. attachments) and supabase/sql/005_section_element_type.sql for the
 * backing column.
 */
export const SectionElementTypeSchema = z.enum([
  "legacy",
  "headline",
  "subheadline",
  "paragraph",
  "richtext",
  "video",
  "pdf",
  "doc",
  "image",
]);

// Basic guard against a richtext block's stored markdown-lite source somehow
// carrying raw markup — the editor (RichTextEditor.tsx) can't produce this by
// normal use, but the server shouldn't blindly trust client-sent strings for
// content that gets rendered on the public issue page.
const DANGEROUS_MARKUP = /<\s*(script|iframe|object|embed)\b|on\w+\s*=|javascript:/i;

/** A section groups a title + description with its own attachments. */
export const SectionInputSchema = z
  .object({
    id: z.string().optional(),
    type: SectionElementTypeSchema.optional().default("legacy"),
    title: z.string().max(200).optional().default(""),
    content: z.string().max(10_000).optional().default(""),
    attachments: z.array(AttachmentInputSchema).max(30).optional().default([]),
  })
  .refine((v) => v.type !== "richtext" || !DANGEROUS_MARKUP.test(v.content), {
    message: "Rich text content contains disallowed markup",
    path: ["content"],
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

/** A layout entry's key is always a built-in FieldKey. */
const LayoutKeySchema = z.enum(FIELD_KEYS);

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
