"use client";

import { useEffect, useState } from "react";
import { IconDownload, IconX } from "@tabler/icons-react";
import { PdfViewer } from "./PdfViewer";
import { isDocx, type AttachmentKind } from "./types";

export type ViewerTarget = {
  kind: AttachmentKind;
  filename: string;
  mime: string;
  url: string | null;
  /** For .docx text extraction: either the saved attachment's id (view page)
   *  or its raw storage path (form, before the issue is saved). */
  attachmentId?: string | null;
  storagePath?: string | null;
  caption?: string | null;
};

export function AttachmentViewerModal({
  target,
  onClose,
}: {
  target: ViewerTarget | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [target, onClose]);

  if (!target) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-slate-900/60 p-0 sm:items-center sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={target.filename}
    >
      <div
        className="flex h-full w-full flex-col overflow-hidden bg-white sm:h-[92vh] sm:max-w-6xl sm:rounded-lg sm:border sm:border-slate-200 sm:shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-ink-900">
              {target.filename}
            </div>
            {target.caption && (
              <div className="truncate text-xs text-slate-500">
                {target.caption}
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {target.url && (
              <a
                href={target.url}
                download={target.filename}
                className="btn btn-outline btn-sm"
                aria-label="Download"
              >
                <IconDownload size={16} />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline btn-sm"
              aria-label="Close"
            >
              <IconX size={16} />
            </button>
          </div>
        </div>
        <div
          className={
            "min-h-0 flex-1 bg-slate-50 " +
            (target.kind === "pdf" ? "overflow-hidden" : "overflow-auto")
          }
        >
          <ViewerBody target={target} />
        </div>
      </div>
    </div>
  );
}

function ViewerBody({ target }: { target: ViewerTarget }) {
  if (target.kind === "image") {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center p-4">
        {target.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={target.url}
            alt={target.caption ?? target.filename}
            className="max-h-full max-w-full rounded object-contain"
          />
        ) : (
          <UnavailableNotice />
        )}
      </div>
    );
  }

  if (target.kind === "video") {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center bg-black p-2 sm:p-4">
        {target.url ? (
          <video
            src={target.url}
            controls
            autoPlay
            className="max-h-full max-w-full rounded"
          />
        ) : (
          <UnavailableNotice />
        )}
      </div>
    );
  }

  if (target.kind === "pdf") {
    return target.url ? (
      <PdfViewer url={target.url} />
    ) : (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <UnavailableNotice />
      </div>
    );
  }

  // document (.doc / .docx)
  if (isDocx(target.mime, target.filename)) {
    return (
      <DocxTextViewer
        attachmentId={target.attachmentId ?? null}
        storagePath={target.storagePath ?? null}
      />
    );
  }

  return (
    <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm text-slate-600">
        Preview isn&apos;t available for this legacy .doc file.
      </p>
      {target.url && (
        <a
          href={target.url}
          download={target.filename}
          className="btn btn-primary btn-sm"
        >
          <IconDownload size={16} className="mr-1.5" /> Download to view
        </a>
      )}
    </div>
  );
}

function UnavailableNotice() {
  return (
    <p className="text-sm text-slate-500">
      This attachment link has expired. Reload the page and try again.
    </p>
  );
}

function DocxTextViewer({
  attachmentId,
  storagePath,
}: {
  attachmentId: string | null;
  storagePath: string | null;
}) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = attachmentId
      ? `id=${encodeURIComponent(attachmentId)}`
      : storagePath
        ? `path=${encodeURIComponent(storagePath)}`
        : null;
    if (!query) {
      setError("Preview isn't available until this file finishes uploading.");
      return;
    }
    let cancelled = false;
    setText(null);
    setError(null);
    fetch(`/api/documents/extract?${query}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Failed to load document");
        if (!cancelled) setText(data.text ?? "");
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load document");
      });
    return () => {
      cancelled = true;
    };
  }, [attachmentId, storagePath]);

  if (error) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center p-6">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (text === null) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center p-6">
        <p className="text-sm text-slate-500">Loading document…</p>
      </div>
    );
  }

  return (
    <div className="whitespace-pre-wrap p-5 text-[15px] leading-relaxed text-ink-900 sm:p-8">
      {text || (
        <span className="text-slate-500">This document has no extractable text.</span>
      )}
    </div>
  );
}
