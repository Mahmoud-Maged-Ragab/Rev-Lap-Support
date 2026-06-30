import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

/**
 * Storage abstraction. Today: local filesystem under /public/uploads.
 * Swap implementation for S3/Cloudinary without touching call sites —
 * keep the `saveVideo` signature stable: { buffer, filename, mime } → { url }.
 */

export const VIDEO_MIME_WHITELIST = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime", // .mov
]);

export const VIDEO_EXT_WHITELIST = new Set([".mp4", ".webm", ".mov"]);

export const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB

function safeExt(filename: string, mime: string): string {
  const fromName = extname(filename).toLowerCase();
  if (VIDEO_EXT_WHITELIST.has(fromName)) return fromName;
  if (mime === "video/mp4") return ".mp4";
  if (mime === "video/webm") return ".webm";
  if (mime === "video/quicktime") return ".mov";
  return ".bin";
}

export async function saveVideo(input: {
  buffer: Buffer;
  filename: string;
  mime: string;
}): Promise<{ url: string }> {
  const dir = join(process.cwd(), "public", "uploads", "videos");
  await mkdir(dir, { recursive: true });

  const id = randomBytes(16).toString("hex");
  const ext = safeExt(input.filename, input.mime);
  const name = `${id}${ext}`;

  await writeFile(join(dir, name), input.buffer);

  // Served by Next from /public at the same path minus "public".
  return { url: `/uploads/videos/${name}` };
}
