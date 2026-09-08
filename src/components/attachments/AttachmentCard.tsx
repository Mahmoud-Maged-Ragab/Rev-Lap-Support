"use client";

import {
  IconCheck,
  IconEye,
  IconFile,
  IconFileTypeDoc,
  IconFileTypePdf,
  IconLoader2,
  IconPhoto,
  IconRefresh,
  IconVideo,
  IconX,
} from "@tabler/icons-react";
import { formatBytes, isDocx, type DraftAttachment } from "./types";

function KindIcon({ mime, filename, kind }: { mime: string; filename: string; kind: DraftAttachment["kind"] }) {
  if (kind === "image") return <IconPhoto size={16} />;
  if (kind === "video") return <IconVideo size={16} />;
  if (kind === "pdf") return <IconFileTypePdf size={16} />;
  if (isDocx(mime, filename)) return <IconFileTypeDoc size={16} />;
  return <IconFile size={16} />;
}

/**
 * Reusable attachment card used everywhere a section/issue collects files:
 * thumbnail, filename, upload status (uploading with real progress /
 * uploaded / failed with retry), a per-attachment caption input, and
 * remove / preview actions. Kept compact so a section with many
 * attachments still reads as a tidy grid.
 */
export function AttachmentCard({
  attachment,
  onCaptionChange,
  onRemove,
  onRetry,
  onPreview,
}: {
  attachment: DraftAttachment;
  onCaptionChange: (caption: string) => void;
  onRemove: () => void;
  onRetry?: () => void;
  onPreview: () => void;
}) {
  const a = attachment;
  const isDocLike = a.kind === "pdf" || a.kind === "document";

  return (
    <div className="card flex w-full flex-col overflow-hidden text-sm">
      <button
        type="button"
        onClick={onPreview}
        disabled={a.status !== "ready"}
        className="relative block aspect-video w-full shrink-0 overflow-hidden border-b border-slate-200 bg-slate-100 disabled:cursor-default"
      >
        {a.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={a.previewUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : a.kind === "video" ? (
          <video src={a.previewUrl} className="h-full w-full object-cover" muted />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400">
            <KindIcon mime={a.mime} filename={a.filename} kind={a.kind} />
          </div>
        )}

        {a.status === "uploading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-white/80">
            <IconLoader2 size={20} className="animate-spin text-slate-500" />
            <div className="h-1 w-2/3 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${a.progress ?? 0}%` }}
              />
            </div>
          </div>
        )}
        {a.status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50/90 px-2 text-center text-xs text-red-700">
            {a.error ?? "Upload failed"}
          </div>
        )}
      </button>

      <div className="flex items-start justify-between gap-2 px-2.5 pt-2">
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-600">
          <span className="shrink-0 text-slate-400">
            <KindIcon mime={a.mime} filename={a.filename} kind={a.kind} />
          </span>
          <span className="truncate font-medium text-ink-900" title={a.filename}>
            {a.filename}
          </span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
          aria-label={`Remove ${a.filename}`}
        >
          <IconX size={14} />
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 px-2.5 pb-1">
        <span className="text-[11px] text-slate-400">{formatBytes(a.sizeBytes)}</span>
        {a.status === "uploading" && (
          <span className="text-[11px] text-slate-500">Uploading… {a.progress ?? 0}%</span>
        )}
        {a.status === "ready" && (
          <span className="flex items-center gap-0.5 text-[11px] font-medium text-emerald-600">
            <IconCheck size={12} /> Uploaded
          </span>
        )}
        {a.status === "error" && (
          <button
            type="button"
            onClick={onRetry}
            disabled={!onRetry}
            className="flex items-center gap-0.5 text-[11px] font-medium text-red-700 hover:underline disabled:opacity-50"
          >
            <IconRefresh size={12} /> Retry
          </button>
        )}
      </div>

      {isDocLike && a.status === "ready" && (
        <div className="px-2.5 pb-1.5">
          <button
            type="button"
            onClick={onPreview}
            className="btn btn-outline btn-sm w-full !h-7 !text-xs"
          >
            <IconEye size={13} className="mr-1" /> {a.kind === "pdf" ? "Preview PDF" : "Preview"}
          </button>
        </div>
      )}

      <div className="px-2.5 pb-2.5">
        <input
          type="text"
          value={a.caption}
          onChange={(e) => onCaptionChange(e.target.value)}
          placeholder="Caption (optional)"
          maxLength={500}
          className="input !h-8 !px-2 !text-xs"
        />
      </div>
    </div>
  );
}
