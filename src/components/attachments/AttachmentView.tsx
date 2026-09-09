"use client";

import { useState } from "react";
import {
  IconFileTypeDoc,
  IconFileTypePdf,
  IconMaximize,
  IconPlayerPlayFilled,
} from "@tabler/icons-react";
import { AttachmentViewerModal, type ViewerTarget } from "./AttachmentViewerModal";
import { formatBytes, isDocx, type ViewAttachment } from "./types";

function toTarget(a: ViewAttachment): ViewerTarget {
  return {
    kind: a.kind,
    filename: a.filename,
    mime: a.mime,
    url: a.url,
    attachmentId: a.id,
    caption: a.caption,
  };
}

/**
 * A single attached image, shown large and at its natural aspect ratio (no
 * cropping, no stretching) — this is meant to read as real issue content,
 * not a file-manager thumbnail. Click opens the full-screen viewer. The
 * caption, when present, sits directly underneath in a clearly readable
 * size; when absent, no caption element renders at all.
 */
function ImageBlock({ attachment, onOpen }: { attachment: ViewAttachment; onOpen: (target: ViewerTarget) => void }) {
  const a = attachment;
  return (
    <figure className="card overflow-hidden">
      <button
        type="button"
        onClick={() => onOpen(toTarget(a))}
        className="group relative flex w-full items-center justify-center bg-slate-50"
        disabled={!a.url}
        aria-label={`Open ${a.filename} fullscreen`}
      >
        {a.url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={a.url}
              alt={a.caption ?? a.filename}
              className="max-h-[70vh] w-auto max-w-full object-contain"
            />
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-900/0 transition group-hover:bg-slate-900/20">
              <IconMaximize
                size={28}
                className="text-white opacity-0 drop-shadow transition group-hover:opacity-100"
              />
            </span>
          </>
        ) : (
          <div className="flex aspect-video w-full items-center justify-center bg-slate-100 text-xs text-slate-400">
            Unavailable
          </div>
        )}
      </button>
      {a.caption && (
        <figcaption className="border-t border-slate-200 px-4 py-3 text-[15px] leading-relaxed text-slate-700">
          {a.caption}
        </figcaption>
      )}
    </figure>
  );
}

function VideoBlock({ attachment }: { attachment: ViewAttachment }) {
  const a = attachment;
  return (
    <figure className="card overflow-hidden">
      {a.url ? (
        <video src={a.url} controls preload="metadata" className="aspect-video w-full bg-black" />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-slate-100 text-xs text-slate-400">
          <IconPlayerPlayFilled size={20} />
        </div>
      )}
      {a.caption && (
        <figcaption className="border-t border-slate-200 px-4 py-3 text-[15px] leading-relaxed text-slate-700">
          {a.caption}
        </figcaption>
      )}
    </figure>
  );
}

/** A PDF/DOC/DOCX attachment — a large, clearly-labeled card that opens the
 *  in-app viewer (see AttachmentViewerModal). Never links out to a new tab. */
function DocumentBlock({
  attachment,
  onOpen,
}: {
  attachment: ViewAttachment;
  onOpen: (target: ViewerTarget) => void;
}) {
  const a = attachment;
  const Icon = a.kind === "pdf" ? IconFileTypePdf : IconFileTypeDoc;
  const canPreview = a.kind === "pdf" || isDocx(a.mime, a.filename);

  return (
    <button
      type="button"
      onClick={() => onOpen(toTarget(a))}
      disabled={!a.url}
      className="card flex w-full items-center gap-4 p-4 text-left transition hover:border-accent hover:bg-accent/5 disabled:opacity-60 sm:p-5"
    >
      <span
        className={
          "flex h-14 w-14 shrink-0 items-center justify-center rounded-lg " +
          (a.kind === "pdf" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600")
        }
      >
        <Icon size={28} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink-900 sm:text-base">
          {a.filename}
        </span>
        <span className="mt-0.5 block text-xs text-slate-500">
          {formatBytes(a.sizeBytes)}
          {canPreview && " · Click to preview"}
        </span>
        {a.caption && (
          <span className="mt-1.5 block text-sm leading-relaxed text-slate-600">{a.caption}</span>
        )}
        {!canPreview && (
          <span className="mt-1 block text-xs text-slate-400">Download to view</span>
        )}
      </span>
      {canPreview && <IconMaximize size={18} className="shrink-0 self-start text-slate-300" />}
    </button>
  );
}

export function AttachmentGrid({ attachments }: { attachments: ViewAttachment[] }) {
  const [target, setTarget] = useState<ViewerTarget | null>(null);
  if (attachments.length === 0) return null;

  const images = attachments.filter((a) => a.kind === "image");
  const videos = attachments.filter((a) => a.kind === "video");
  const docs = attachments.filter((a) => a.kind === "pdf" || a.kind === "document");

  return (
    <div className="space-y-5">
      {images.length > 0 && (
        <div className="space-y-4">
          {images.map((a) => (
            <ImageBlock key={a.id} attachment={a} onOpen={setTarget} />
          ))}
        </div>
      )}
      {videos.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {videos.map((a) => (
            <VideoBlock key={a.id} attachment={a} />
          ))}
        </div>
      )}
      {docs.length > 0 && (
        <div className="space-y-3">
          {docs.map((a) => (
            <DocumentBlock key={a.id} attachment={a} onOpen={setTarget} />
          ))}
        </div>
      )}
      <AttachmentViewerModal target={target} onClose={() => setTarget(null)} />
    </div>
  );
}
