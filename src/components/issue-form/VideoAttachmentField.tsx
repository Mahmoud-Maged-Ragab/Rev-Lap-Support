"use client";

import { useEffect, useRef, useState } from "react";
import { IconCheck, IconLoader2, IconRefresh } from "@tabler/icons-react";
import { AttachmentSourceTabs, type AttachmentSourceMode } from "@/components/attachments/AttachmentSourceTabs";
import { AttachmentViewerModal, type ViewerTarget } from "@/components/attachments/AttachmentViewerModal";
import { DriveLinkInput } from "@/components/attachments/DriveLinkInput";
import { driveEmbedUrl, parseGoogleDriveUrl } from "@/lib/googleDrive";
import { uploadFileWithProgress } from "@/components/attachments/uploadFile";
import { formatBytes, type DraftAttachment } from "@/components/attachments/types";

function newClientId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `v${Date.now()}${Math.random().toString(16).slice(2)}`;
}

/**
 * Multi-video field restyled after the project's original single-video
 * `VideoField` component (large bordered preview player, plain-text
 * actions, stacked full-width layout) instead of the small grid thumbnail
 * cards used for images/PDF. Functionally it's the same upload/caption/
 * remove flow as `AttachmentUploader` (including real upload progress and
 * retry-on-failure), just kind-locked to "video" and laid out old-style.
 */
export function VideoAttachmentField({
  attachments,
  onChange,
  idPrefix,
}: {
  attachments: DraftAttachment[];
  onChange: (next: DraftAttachment[]) => void;
  idPrefix: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [viewerTarget, setViewerTarget] = useState<ViewerTarget | null>(null);
  const [sourceMode, setSourceMode] = useState<AttachmentSourceMode>("upload");

  // See AttachmentUploader.tsx for why patch() must read/write a ref rather
  // than close over the `attachments` prop directly (concurrent uploads
  // finishing in the same tick would otherwise silently drop each other's
  // updates, leaving a card stuck on "Uploading…" forever).
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
    const videos = all.filter((f) => f.type.startsWith("video/"));
    const picked = videos.slice(0, 20);
    setPickError(
      all.length > videos.length
        ? "Only video files (MP4, WEBM, MOV) are accepted here."
        : null,
    );

    const drafts: DraftAttachment[] = picked.map((file) => ({
      clientId: newClientId(),
      kind: "video",
      filename: file.name,
      mime: file.type || "video/mp4",
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

  function removeVideo(a: DraftAttachment) {
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

  function addDriveVideo(url: string) {
    if (!parseGoogleDriveUrl(url)) return;
    const draft: DraftAttachment = {
      clientId: newClientId(),
      kind: "video",
      source: "drive",
      filename: "Google Drive video",
      mime: "video/*",
      sizeBytes: 0,
      caption: "",
      storagePath: null,
      externalUrl: url,
      previewUrl: url,
      status: "ready",
    };
    applyChange((prev) => [...prev, draft]);
  }

  return (
    <div className="space-y-4">
      <AttachmentSourceTabs value={sourceMode} onChange={setSourceMode} />

      {sourceMode === "upload" ? (
        <div>
          <input
            ref={fileRef}
            id={`${idPrefix}-video-input`}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            multiple
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
              e.target.value = "";
            }}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-white hover:file:bg-slate-800"
          />
          <p className="mt-1 text-xs text-slate-500">mp4, webm, or mov — multiple allowed.</p>
          {pickError && <p className="mt-1 text-xs text-red-700">{pickError}</p>}
        </div>
      ) : (
        <DriveLinkInput kind="video" onAdd={({ url }) => addDriveVideo(url)} />
      )}

      {attachments.length > 0 && (
        <div className="space-y-4">
          {attachments.map((a) => (
            <div key={a.clientId} className="space-y-1.5">
              <div className="text-xs font-medium text-slate-500">Preview</div>
              <div className="relative overflow-hidden rounded-md border border-slate-200 bg-black">
                {a.status === "uploading" ? (
                  <div className="flex aspect-video w-full flex-col items-center justify-center gap-2">
                    <IconLoader2 size={24} className="animate-spin text-slate-300" />
                    <div className="h-1 w-2/3 overflow-hidden rounded-full bg-slate-700">
                      <div
                        className="h-full bg-accent transition-all"
                        style={{ width: `${a.progress ?? 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400">{a.progress ?? 0}%</span>
                  </div>
                ) : a.status === "error" ? (
                  <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 px-3 text-center text-xs text-red-300">
                    {a.error ?? "Upload failed"}
                    <button
                      type="button"
                      onClick={() => retryUpload(a.clientId)}
                      className="flex items-center gap-1 rounded border border-red-300 px-2 py-1 text-red-200 hover:bg-red-900/30"
                    >
                      <IconRefresh size={12} /> Retry
                    </button>
                  </div>
                ) : a.source === "drive" ? (
                  <iframe
                    src={driveEmbedUrl(parseGoogleDriveUrl(a.previewUrl)?.id ?? "")}
                    className="aspect-video w-full"
                    allow="autoplay"
                    title={a.filename}
                  />
                ) : (
                  <video
                    src={a.previewUrl}
                    controls
                    preload="metadata"
                    playsInline
                    webkit-playsinline="true"
                    className="w-full cursor-pointer"
                    onClick={() =>
                      setViewerTarget({
                        kind: "video",
                        filename: a.filename,
                        mime: a.mime,
                        url: a.previewUrl || null,
                        caption: a.caption,
                      })
                    }
                  />
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="truncate">{a.filename}</span>
                <span className="flex shrink-0 items-center gap-2">
                  {a.source !== "drive" && <span>{formatBytes(a.sizeBytes)}</span>}
                  {a.status === "ready" && (
                    <span className="flex items-center gap-0.5 font-medium text-emerald-600">
                      <IconCheck size={12} /> {a.source === "drive" ? "Linked" : "Uploaded"}
                    </span>
                  )}
                </span>
              </div>
              <input
                type="text"
                value={a.caption}
                onChange={(e) => patch(a.clientId, { caption: e.target.value })}
                placeholder="Caption (optional)"
                maxLength={500}
                className="input !h-8 !text-xs"
              />
              <button
                type="button"
                onClick={() => removeVideo(a)}
                className="text-xs text-red-700 hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <AttachmentViewerModal target={viewerTarget} onClose={() => setViewerTarget(null)} />
    </div>
  );
}
