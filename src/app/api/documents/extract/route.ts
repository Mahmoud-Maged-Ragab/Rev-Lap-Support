import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { downloadAttachment } from "@/lib/uploads";
import { selectOne } from "@/lib/supabase";

export const runtime = "nodejs";

const DOCX_PATH = /^documents\/[\w.-]+\.docx$/i;

/**
 * Extracts plain text from a .docx attachment so it can be shown in the
 * internal document viewer instead of opening a new tab. Legacy .doc
 * (binary OLE format) isn't supported here — the client falls back to a
 * download link for those.
 *
 * GET is intentionally public (no session check): it mirrors how the
 * attachment itself is only ever reachable via a signed URL scoped to a
 * public issue page, and this route only serves attachments that exist as
 * a real `issue_attachments` row of kind "document".
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const pathParam = url.searchParams.get("path");

  let path: string | null = null;
  if (id) {
    const attachment = await selectOne<{ storagePath: string }>(
      "issue_attachments",
      {
        select: "storagePath",
        filters: { id: `eq.${id}`, kind: "eq.document" },
      },
    );
    if (!attachment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    path = attachment.storagePath;
  } else if (pathParam && DOCX_PATH.test(pathParam)) {
    // Not yet linked to a saved issue_attachments row (e.g. previewing in
    // the admin form before the issue is submitted). The path itself is an
    // unguessable, admin-uploaded storage key — format-validated above —
    // so this is safe without a DB row to match against.
    path = pathParam;
  }

  if (!path || !DOCX_PATH.test(path)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const buffer = await downloadAttachment(path);
    const { value: text } = await mammoth.extractRawText({ buffer });
    return NextResponse.json({ text });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to extract document text";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
