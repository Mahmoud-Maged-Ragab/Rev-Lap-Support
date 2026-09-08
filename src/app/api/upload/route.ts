import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import {
  classifyMime,
  deleteAttachmentFile,
  maxBytesFor,
  uploadAttachment,
} from "@/lib/uploads";

export const runtime = "nodejs";

/**
 * Unified attachment upload endpoint. Accepts an image, video, PDF, or
 * Word document, validates it, and stores it in the private "issues"
 * Supabase Storage bucket. The caller gets back an opaque `path` (never a
 * public URL) to reference from an issue/section attachment payload — see
 * POST/PUT /api/issues.
 */
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

  const mime = file.type || "application/octet-stream";
  const kind = classifyMime(mime);
  if (!kind) {
    return NextResponse.json(
      {
        error:
          "Unsupported file type. Use an image (PNG/JPG/WEBP/GIF), a video (MP4/WEBM/MOV), a PDF, or a document (DOC/DOCX).",
      },
      { status: 415 },
    );
  }

  const maxBytes = maxBytesFor(kind);
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `File too large. Max ${Math.round(maxBytes / (1024 * 1024))} MB for ${kind}s.` },
      { status: 413 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadAttachment({
      buffer,
      filename: file.name || "file",
      mime,
      kind,
    });
    return NextResponse.json(
      {
        path: result.path,
        filename: result.filename,
        mime: result.mime,
        size: result.size,
        kind,
      },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const VALID_PATH = /^(images|videos|pdf|documents)\/[\w.-]+$/;

/** Remove an uploaded-but-not-yet-saved attachment (e.g. user hit "remove" before submitting). */
export async function DELETE(req: Request) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const path = (body as { path?: unknown })?.path;
  if (typeof path !== "string" || !VALID_PATH.test(path)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  await deleteAttachmentFile(path).catch(() => {});
  return NextResponse.json({ ok: true });
}
