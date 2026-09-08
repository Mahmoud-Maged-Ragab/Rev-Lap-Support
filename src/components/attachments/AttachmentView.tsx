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
 * Read-only attachment display for the public issue page. Images/videos
 * render inline with their caption underneath; documents render as a
 * compact open-able row. Grouping (grid vs. list) is handled by
 * `AttachmentGrid` below.
 */
function AttachmentBlock({
  attachment,
  onOpen,
}: {
  attachment: ViewAttachment;
  onOpen: (target: ViewerTarget) => void;
}) {
  const a = attachment;

  if (a.kind === "image") {
    return (
      <figure className="card overflow-hidden">
        <button
          type="button"
          onClick={() => onOpen(toTarget(a))}
          className="group relative block w-full"
          disabled={!a.url}
          aria-label={`Open ${a.filename} fullscreen`}
        >
          {a.url ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.url}
                alt={a.caption ?? a.filename}
                className="aspect-video w-full object-cover"
              />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-900/0 transition group-hover:bg-slate-900/20">
                <IconMaximize
                  size={20}
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
        {(a.caption || a.url) && (
          <figcaption className="border-t border-slate-200 px-3 py-2 text-xs">
            {a.caption && <span className="block text-slate-600">{a.caption}</span>}
            <span className="mt-0.5 block truncate text-slate-400">
              {a.filename} · {formatBytes(a.sizeBytes)}
            </span>
          </figcaption>
        )}
      </figure>
    );
  }

  if (a.kind === "video") {
    return (
      <figure className="card overflow-hidden">
        {a.url ? (
          <video
            src={a.url}
            controls
            preload="metadata"
            className="aspect-video w-full bg-black"
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center bg-slate-100 text-xs text-slate-400">
            <IconPlayerPlayFilled size={20} />
          </div>
        )}
        {(a.caption || a.url) && (
          <figcaption className="border-t border-slate-200 px-3 py-2 text-xs">
            {a.caption && <span className="block text-slate-600">{a.caption}</span>}
            <span className="mt-0.5 block truncate text-slate-400">
              {a.filename} · {formatBytes(a.sizeBytes)}
            </span>
          </figcaption>
        )}
      </figure>
    );
  }

  // pdf | document
  const Icon = a.kind === "pdf" ? IconFileTypePdf : IconFileTypeDoc;
  const canPreview = a.kind === "pdf" || isDocx(a.mime, a.filename);

  return (
    <button
      type="button"
      onClick={() => onOpen(toTarget(a))}
      disabled={!a.url}
      className="card flex w-full items-start gap-3 p-3 text-left hover:bg-slate-50 disabled:opacity-60"
    >
      <span className="mt-0.5 shrink-0 text-slate-400">
        <Icon size={22} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink-900">
          {a.filename}
        </span>
        <span className="mt-0.5 block text-xs text-slate-400">
          {formatBytes(a.sizeBytes)}
        </span>
        {a.caption && (
          <span className="mt-0.5 block text-xs text-slate-500">{a.caption}</span>
        )}
        {!canPreview && (
          <span className="mt-0.5 block text-xs text-slate-400">
            Download to view
          </span>
        )}
      </span>
    </button>
  );
}

export function AttachmentGrid({ attachments }: { attachments: ViewAttachment[] }) {
  const [target, setTarget] = useState<ViewerTarget | null>(null);
  if (attachments.length === 0) return null;

  const media = attachments.filter((a) => a.kind === "image" || a.kind === "video");
  const docs = attachments.filter((a) => a.kind === "pdf" || a.kind === "document");

  return (
    <div className="space-y-2.5">
      {media.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {media.map((a) => (
            <AttachmentBlock key={a.id} attachment={a} onOpen={setTarget} />
          ))}
        </div>
      )}
      {docs.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {docs.map((a) => (
            <AttachmentBlock key={a.id} attachment={a} onOpen={setTarget} />
          ))}
        </div>
      )}
      <AttachmentViewerModal target={target} onClose={() => setTarget(null)} />
    </div>
  );
}
