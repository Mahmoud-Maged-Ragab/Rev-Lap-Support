"use client";

import { IconBrandGoogleDrive, IconUpload } from "@tabler/icons-react";

export type AttachmentSourceMode = "upload" | "drive";

/** Segmented "Upload File / Google Drive" control shown above the media
 *  picker for Video/Image/PDF/Document fields — see AttachmentUploader.tsx
 *  and VideoAttachmentField.tsx, the two places a Drive link can be added. */
export function AttachmentSourceTabs({
  value,
  onChange,
}: {
  value: AttachmentSourceMode;
  onChange: (mode: AttachmentSourceMode) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Attachment source"
      className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium"
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === "upload"}
        onClick={() => onChange("upload")}
        className={
          "flex items-center gap-1.5 rounded px-2.5 py-1.5 transition " +
          (value === "upload" ? "bg-white text-ink-900 shadow-sm" : "text-slate-500 hover:text-slate-700")
        }
      >
        <IconUpload size={13} /> Upload file
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "drive"}
        onClick={() => onChange("drive")}
        className={
          "flex items-center gap-1.5 rounded px-2.5 py-1.5 transition " +
          (value === "drive" ? "bg-white text-ink-900 shadow-sm" : "text-slate-500 hover:text-slate-700")
        }
      >
        <IconBrandGoogleDrive size={13} /> Google Drive
      </button>
    </div>
  );
}
