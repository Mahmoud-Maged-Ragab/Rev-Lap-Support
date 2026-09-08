import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { AttachmentKind } from "./validation";

/**
 * Attachment storage. Every issue/section attachment (image, video,
 * document) lives in the same private Supabase Storage bucket ("issues"),
 * under a folder per kind. Swap this file's implementation to change where
 * files live without touching call sites: the exported function
 * signatures are the contract.
 *
 * The bucket is private; we never persist a public/signed URL. Only the
 * `storagePath` (object key) is stored in the DB, and a short-lived signed
 * URL is minted on read (see `signPaths`) so attachments are never exposed
 * longer than a page view needs.
 */

const BUCKET = "issues";

export const IMAGE_MIME_WHITELIST = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export const VIDEO_MIME_WHITELIST = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime", // .mov
]);

export const PDF_MIME_WHITELIST = new Set(["application/pdf"]);

export const DOCUMENT_MIME_WHITELIST = new Set([
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
]);

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB, matches the bucket's server-enforced cap
export const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20 MB
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024; // 20 MB

const EXT_BY_MIME: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
};

const ALL_EXTS = new Set(Object.values(EXT_BY_MIME));

/** Classify a MIME type; null if it's not an attachment type we accept. */
export function classifyMime(mime: string): AttachmentKind | null {
  if (IMAGE_MIME_WHITELIST.has(mime)) return "image";
  if (VIDEO_MIME_WHITELIST.has(mime)) return "video";
  if (PDF_MIME_WHITELIST.has(mime)) return "pdf";
  if (DOCUMENT_MIME_WHITELIST.has(mime)) return "document";
  return null;
}

export function maxBytesFor(kind: AttachmentKind): number {
  if (kind === "image") return MAX_IMAGE_BYTES;
  if (kind === "video") return MAX_VIDEO_BYTES;
  if (kind === "pdf") return MAX_PDF_BYTES;
  return MAX_DOCUMENT_BYTES;
}

function pickExt(filename: string, mime: string): string {
  const fromName = extname(filename).toLowerCase();
  if (ALL_EXTS.has(fromName)) return fromName;
  return EXT_BY_MIME[mime] ?? "";
}

const CONTROL_CHARS = /[\x00-\x1f\x7f]/g;

/** Strip path separators/control chars; keep it short and display-safe. */
export function sanitizeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "file";
  const cleaned = base
    .replace(CONTROL_CHARS, "")
    .replace(/[^\w.\- ()]/g, "_")
    .trim();
  const safe = cleaned.length > 0 ? cleaned : "file";
  return safe.length > 150 ? safe.slice(0, 150) : safe;
}

function storageClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase env not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

const KIND_FOLDER: Record<AttachmentKind, string> = {
  image: "images",
  video: "videos",
  pdf: "pdf",
  document: "documents",
};

export async function uploadAttachment(input: {
  buffer: Buffer;
  filename: string;
  mime: string;
  kind: AttachmentKind;
}): Promise<{ path: string; filename: string; mime: string; size: number }> {
  const ext = pickExt(input.filename, input.mime);
  const objectPath = `${KIND_FOLDER[input.kind]}/${randomUUID()}${ext}`;

  const supabase = storageClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, input.buffer, {
      contentType: input.mime,
      cacheControl: "3600",
      upsert: false,
    });
  if (error) throw new Error(`Upload failed: ${error.message}`);

  return {
    path: objectPath,
    filename: sanitizeFilename(input.filename),
    mime: input.mime,
    size: input.buffer.byteLength,
  };
}

/** Best-effort delete; callers should not let this fail the outer operation. */
export async function deleteAttachmentFile(path: string): Promise<void> {
  const supabase = storageClient();
  await supabase.storage.from(BUCKET).remove([path]);
}

export async function deleteAttachmentFiles(paths: string[]): Promise<void> {
  const clean = Array.from(new Set(paths.filter(Boolean)));
  if (clean.length === 0) return;
  const supabase = storageClient();
  await supabase.storage.from(BUCKET).remove(clean);
}

/**
 * Mint short-lived signed URLs for a set of object paths. Missing/errored
 * paths are simply omitted from the result map.
 */
export async function signPaths(
  paths: string[],
  expiresInSeconds = 60 * 60,
): Promise<Record<string, string>> {
  const clean = Array.from(new Set(paths.filter(Boolean)));
  if (clean.length === 0) return {};

  const supabase = storageClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(clean, expiresInSeconds);
  if (error || !data) return {};

  const map: Record<string, string> = {};
  for (const row of data) {
    if (row.path && row.signedUrl) map[row.path] = row.signedUrl;
  }
  return map;
}

/** Download raw bytes for server-side processing (e.g. .docx text extraction). */
export async function downloadAttachment(path: string): Promise<Buffer> {
  const supabase = storageClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) {
    throw new Error(error?.message ?? "Download failed");
  }
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export { BUCKET as ATTACHMENT_BUCKET };
