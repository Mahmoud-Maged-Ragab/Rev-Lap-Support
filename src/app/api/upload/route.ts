import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { readSession } from "@/lib/auth";

export const runtime = "nodejs";

const BUCKET = "issues";
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

const IMAGE_MIME_WHITELIST = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

const ALLOWED_EXTS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".svg",
  ".pdf",
]);

function pickExt(filename: string, mime: string): string {
  const fromName = extname(filename).toLowerCase();
  if (ALLOWED_EXTS.has(fromName)) return fromName;
  if (mime === "application/pdf") return ".pdf";
  if (mime === "image/png") return ".png";
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/gif") return ".gif";
  if (mime === "image/svg+xml") return ".svg";
  return "";
}

function getStorageClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase env not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ct = req.headers.get("content-type") ?? "";
  if (!ct.toLowerCase().startsWith("multipart/form-data")) {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form payload" },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing 'file' field" },
      { status: 400 },
    );
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large. Max ${MAX_BYTES / (1024 * 1024)} MB.` },
      { status: 413 },
    );
  }

  const mime = file.type || "application/octet-stream";
  const isPdf = mime === "application/pdf";
  const isImage = IMAGE_MIME_WHITELIST.has(mime);
  if (!isPdf && !isImage) {
    return NextResponse.json(
      { error: "Unsupported file type. Use an image or PDF." },
      { status: 415 },
    );
  }

  const ext = pickExt(file.name || "", mime);
  if (!ext || !ALLOWED_EXTS.has(ext)) {
    return NextResponse.json(
      { error: "Unsupported file extension." },
      { status: 415 },
    );
  }

  const folder = isPdf ? "pdfs" : "images";
  const objectPath = `${folder}/${randomUUID()}${ext}`;

  try {
    const supabase = getStorageClient();
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, buffer, {
        contentType: mime,
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 502 },
      );
    }

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(objectPath, 60 * 10); // 10 minutes

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const url = data.signedUrl;
    if (!url) {
      return NextResponse.json(
        { error: "Failed to resolve public URL." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { url, path: objectPath, bytes: file.size, mime },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown upload error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
