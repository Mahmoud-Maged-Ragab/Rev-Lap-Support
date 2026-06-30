import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
});

export const IssueInputSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(5).max(10_000),
  errorMessage: z.string().max(5_000).optional().nullable(),
  solution: z.string().min(5).max(20_000),
  categoryId: z.string().optional().nullable(),
  // Accept either a comma string or array of tag NAMES (legacy)
  tags: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .default([]),
  // Preferred: array of existing tag IDs
  tagIds: z.array(z.string().min(1)).max(50).optional(),
  images: z.array(z.string().url()).max(20).optional().default([]),
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
