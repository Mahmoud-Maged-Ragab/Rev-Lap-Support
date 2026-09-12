export type AttachmentKind = "image" | "video" | "pdf" | "document";

/** Where an attachment's bytes actually live: uploaded to our storage bucket,
 *  or a Google Drive file the user linked instead (video/image/pdf/document —
 *  see lib/googleDrive.ts). Omitted/undefined means "upload", for every
 *  attachment created before this distinction existed. */
export type AttachmentSource = "upload" | "drive";

/**
 * One attachment as edited in the issue form, before/after upload.
 * `clientId` is a stable React key that never changes; `id` is the DB row
 * id, present once this attachment has been saved at least once.
 */
export type DraftAttachment = {
  clientId: string;
  id?: string;
  kind: AttachmentKind;
  source?: AttachmentSource;
  filename: string;
  mime: string;
  sizeBytes: number;
  caption: string;
  storagePath: string | null;
  /** The original Google Drive share URL, when source === "drive". */
  externalUrl?: string | null;
  previewUrl: string;
  status: "uploading" | "ready" | "error";
  /** 0-100, real byte-level progress from the upload XHR (see uploadFile.ts) — never faked. */
  progress?: number;
  error?: string;
};

/** One attachment as returned by the server for read-only display. */
export type ViewAttachment = {
  id: string;
  kind: AttachmentKind;
  source?: AttachmentSource;
  url: string | null;
  filename: string;
  mime: string;
  sizeBytes: number;
  caption: string | null;
};

export function isDriveAttachment(a: { source?: AttachmentSource }): boolean {
  return a.source === "drive";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isDocx(mime: string, filename: string): boolean {
  return (
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    /\.docx$/i.test(filename)
  );
}

export function isPdf(mime: string, filename: string): boolean {
  return mime === "application/pdf" || /\.pdf$/i.test(filename);
}
