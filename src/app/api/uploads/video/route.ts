import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import {
  MAX_VIDEO_BYTES,
  VIDEO_MIME_WHITELIST,
  saveVideo,
} from "@/lib/uploads";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ct = req.headers.get("content-type") ?? "";
  if (!ct.toLowerCase().startsWith("multipart/form-data")) {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form payload" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing 'file' field" }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return NextResponse.json(
      { error: `File too large. Max ${MAX_VIDEO_BYTES / (1024 * 1024)} MB.` },
      { status: 413 }
    );
  }

  const mime = file.type || "";
  if (!VIDEO_MIME_WHITELIST.has(mime)) {
    return NextResponse.json(
      { error: "Unsupported file type. Use mp4, webm, or mov." },
      { status: 415 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { url } = await saveVideo({
    buffer,
    filename: file.name || "video",
    mime,
  });

  return NextResponse.json({ url, bytes: file.size, mime }, { status: 201 });
}
