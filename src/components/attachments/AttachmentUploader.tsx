"use client";

import { useEffect, useRef, useState } from "react";
import { IconPaperclip } from "@tabler/icons-react";
import { AttachmentCard } from "./AttachmentCard";
import { AttachmentViewerModal, type ViewerTarget } from "./AttachmentViewerModal";
import { uploadFileWithProgress } from "./uploadFile";
import type { DraftAttachment } from "./types";

const ACCEPT_BY_KIND: Record<DraftAttachment["kind"], string> = {
  image: "image/png,image/jpeg,image/webp,image/gif",
  video: "video/mp4,video/webm,video/quicktime",
  pdf: "application/pdf",
  document:
    "application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function newClientId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `c${Date.now()}${Math.random().toString(16).slice(2)}`;
}

function guessKind(mime: string): DraftAttachment["kind"] {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "pdf";
  return "document";
}

/**
 * Multi-file picker + grid of AttachmentCards. Files upload immediately on
 * selection with real byte-progress (shown per-card, never faked); the
 * parent only ever sees `attachments`, keyed by stable `clientId`.
 *
 * `onChange` always goes through `applyChange`, which reads/writes
 * `attachmentsRef` rather than the `attachments` prop directly — a plain
 * closure over the prop goes stale the instant a second file finishes
 * uploading while the first `patch()` call is still in flight (both would
 * compute their next array from the same pre-upload snapshot and the
 * loser's update would be silently dropped, leaving that card stuck on
 * "Uploading…" forever). The ref always holds the latest array.
 */
const ALL_KINDS: DraftAttachment["kind"][] = ["image", "video", "pdf", "document"];

export function AttachmentUploader({
  attachments,
  onChange,
  idPrefix,
  allowedKinds = ALL_KINDS,
  label = "Add files",
  hint = "Images, videos, PDF, DOC/DOCX — multiple at once.",
}: {
  attachments: DraftAttachment[];
  onChange: (next: DraftAttachment[]) => void;
  idPrefix: string;
  /** Restrict what this instance accepts/uploads — used for the dedicated Images/PDF/Documents form-builder fields. */
  allowedKinds?: DraftAttachment["kind"][];
  label?: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [viewerTarget, setViewerTarget] = useState<ViewerTarget | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const accept = allowedKinds.map((k) => ACCEPT_BY_KIND[k]).join(",");

  const attachmentsRef = useRef(attachments);
  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);
  const filesByClientId = useRef(new Map<string, File>());

  function applyChange(updater: (prev: DraftAttachment[]) => DraftAttachment[]) {
    const next = updater(attachmentsRef.current);
    attachmentsRef.current = next;
    onChange(next);
  }

  function patch(clientId: string, patchObj: Partial<DraftAttachment>) {
    applyChange((prev) => prev.map((a) => (a.clientId === clientId ? { ...a, ...patchObj } : a)));
  }

  async function uploadOne(clientId: string, file: File) {
    patch(clientId, { status: "uploading", progress: 0, error: undefined });
    try {
      const data = await uploadFileWithProgress(file, (progress) => patch(clientId, { progress }));
      patch(clientId, {
        storagePath: data.path,
        filename: data.filename,
        mime: data.mime,
        sizeBytes: data.size,
        kind: data.kind as DraftAttachment["kind"],
        status: "ready",
        progress: 100,
      });
    } catch (err) {
      patch(clientId, {
        status: "error",
        error: err instanceof Error ? err.message : "Upload failed",
      });
    }
  }

  async function handleFiles(files: FileList) {
    const all = Array.from(files);
    const allowed = all.filter((f) => allowedKinds.includes(guessKind(f.type)));
    const picked = allowed.slice(0, 20);
    const rejected = all.length - allowed.length;
    const truncated = allowed.length - picked.length;
    setPickError(
      rejected > 0
        ? `${rejected} file(s) skipped — unsupported type for this field.`
        : truncated > 0
          ? `Only the first 20 files were added (${truncated} skipped).`
          : null,
    );

    const drafts: DraftAttachment[] = picked.map((file) => ({
      clientId: newClientId(),
      kind: guessKind(file.type),
      filename: file.name,
      mime: file.type || "application/octet-stream",
      sizeBytes: file.size,
      caption: "",
      storagePath: null,
      previewUrl: URL.createObjectURL(file),
      status: "uploading",
      progress: 0,
    }));
    picked.forEach((file, i) => filesByClientId.current.set(drafts[i].clientId, file));

    applyChange((prev) => [...prev, ...drafts]);

    await Promise.all(picked.map((file, i) => uploadOne(drafts[i].clientId, file)));
  }

  function retryUpload(clientId: string) {
    const file = filesByClientId.current.get(clientId);
    if (!file) {
      patch(clientId, { status: "error", error: "Can't retry — please remove and re-add this file." });
      return;
    }
    uploadOne(clientId, file);
  }

  function removeAttachment(a: DraftAttachment) {
    applyChange((prev) => prev.filter((x) => x.clientId !== a.clientId));
    filesByClientId.current.delete(a.clientId);
    if (a.storagePath) {
      fetch("/api/upload", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: a.storagePath }),
      }).catch(() => {});
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => inputRef.current?.click()}
        >
          <IconPaperclip size={15} className="mr-1.5" /> {label}
        </button>
        <span className="text-xs text-slate-500">{hint}</span>
        <input
          ref={inputRef}
          id={`${idPrefix}-file-input`}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFiles(e.target.files);
            }
            e.target.value = "";
          }}
        />
      </div>

      {pickError && <p className="text-xs text-red-700">{pickError}</p>}

      {attachments.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {attachments.map((a) => (
            <AttachmentCard
              key={a.clientId}
              attachment={a}
              onCaptionChange={(caption) => patch(a.clientId, { caption })}
              onRemove={() => removeAttachment(a)}
              onRetry={() => retryUpload(a.clientId)}
              onPreview={() =>
                setViewerTarget({
                  kind: a.kind,
                  filename: a.filename,
                  mime: a.mime,
                  url: a.previewUrl || null,
                  attachmentId: a.id ?? null,
                  storagePath: a.storagePath,
                  caption: a.caption,
                })
              }
            />
          ))}
        </div>
      )}

      <AttachmentViewerModal target={viewerTarget} onClose={() => setViewerTarget(null)} />
    </div>
  );
}
