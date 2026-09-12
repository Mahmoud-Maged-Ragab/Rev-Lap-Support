/**
 * Reusable Google Drive share-URL parser, shared by every place that needs
 * to accept a Drive link instead of an uploaded file (Video / Image / PDF /
 * Document content elements — see DriveLinkInput.tsx for the shared
 * input+preview UI, and validation.ts's AttachmentInputSchema for
 * server-side re-validation).
 *
 * Deliberately pure string parsing — no network request is ever made from
 * here or from any server code path for a user-provided Drive URL (that
 * would be an SSRF / open-proxy risk). The actual preview/embed is always
 * fetched by the *viewer's own browser* via an <iframe>/<img> pointed at
 * Google's own domain, never proxied through this app's server.
 */

export type DriveFileRef = {
  /** The Drive file id extracted from the URL. */
  id: string;
  /** The original URL as entered, kept for storage/display. */
  originalUrl: string;
};

const DRIVE_HOSTS = new Set(["drive.google.com", "docs.google.com"]);

/** A Drive file id is URL-safe base64-ish: letters, digits, - and _. */
const FILE_ID_RE = /^[a-zA-Z0-9_-]{10,200}$/;

/**
 * Parse a Google Drive sharing URL and extract its file id. Returns null for
 * anything that isn't a recognizable Google Drive URL — callers must treat
 * null as "reject this input", never fall back to guessing.
 *
 * Recognized shapes:
 *   https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 *   https://drive.google.com/file/d/FILE_ID/preview
 *   https://drive.google.com/open?id=FILE_ID
 *   https://drive.google.com/uc?id=FILE_ID&export=download
 *   https://docs.google.com/document|spreadsheets|presentation/d/FILE_ID/edit
 */
export function parseGoogleDriveUrl(input: string): DriveFileRef | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (!DRIVE_HOSTS.has(host)) return null;

  const fileMatch = url.pathname.match(/\/file\/d\/([^/]+)/);
  if (fileMatch && FILE_ID_RE.test(fileMatch[1])) {
    return { id: fileMatch[1], originalUrl: trimmed };
  }

  const idParam = url.searchParams.get("id");
  if (idParam && FILE_ID_RE.test(idParam)) {
    return { id: idParam, originalUrl: trimmed };
  }

  const docMatch = url.pathname.match(/\/d\/([^/]+)/);
  if (docMatch && FILE_ID_RE.test(docMatch[1])) {
    return { id: docMatch[1], originalUrl: trimmed };
  }

  return null;
}

export function isGoogleDriveUrl(input: string): boolean {
  return parseGoogleDriveUrl(input) !== null;
}

/** Google's own embeddable preview — works for video, PDF, image, and
 *  DOC/DOCX/Google-Docs files alike, and is the only mechanism that actually
 *  streams playable video (the share-page URL is not a raw media stream and
 *  can't go in <video src>). */
export function driveEmbedUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;
}

/** Direct-image endpoint for rendering a Drive image as a plain <img>. Only
 *  works when the file is shared "Anyone with the link" and is actually an
 *  image — callers must still handle onError (see DriveLinkInput.tsx). */
export function driveThumbnailUrl(fileId: string, sizePx = 1600): string {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w${sizePx}`;
}
