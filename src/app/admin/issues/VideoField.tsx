"use client";

import { useEffect, useRef, useState } from "react";

type Mode = "link" | "upload";

function isYouTube(url: string): boolean {
  try {
    const u = new URL(url);
    const h = u.hostname.replace(/^www\./, "");
    return h === "youtube.com" || h === "youtu.be" || h === "m.youtube.com";
  } catch {
    return false;
  }
}

function toYouTubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    const h = u.hostname.replace(/^www\./, "");
    if (h === "youtu.be")
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (h === "youtube.com" || h === "m.youtube.com") {
      if (u.pathname === "/watch") {
        const id = u.searchParams.get("v");
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      const m = u.pathname.match(/^\/(embed|shorts)\/([\w-]{6,})/);
      if (m) return `https://www.youtube.com/embed/${m[2]}`;
    }
    return null;
  } catch {
    return null;
  }
}

function parseGoogleDriveId(url: string): string | null {
  try {
    const u = new URL(url);
    const h = u.hostname.replace(/^www\./, "");
    if (h !== "drive.google.com" && h !== "docs.google.com") {
      return null;
    }
    if (u.pathname.startsWith("/file/d/")) {
      const parts = u.pathname.split("/");
      const id = parts[3];
      return id && /^[\w-]{10,}$/.test(id) ? id : null;
    }
    if (u.pathname === "/open" || u.pathname === "/uc") {
      const id = u.searchParams.get("id");
      return id && /^[\w-]{10,}$/.test(id) ? id : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function VideoField({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [mode, setMode] = useState<Mode>(() =>
    value && value.startsWith("/uploads/") ? "upload" : "link",
  );

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Keep mode in sync if parent clears value externally.
  useEffect(() => {
    if (!value) setMode("link");
    else if (value.startsWith("/uploads/")) setMode("upload");
  }, [value]);

  async function handleFile(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads/video", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      onChange(data.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const youtubeEmbed = mode === "link" && value ? toYouTubeEmbed(value) : null;
  const googleDriveId = mode === "link" && value ? parseGoogleDriveId(value) : null;
  const isUploadedFile = value.startsWith("/uploads/");
  const showDirectVideoPreview =
    value &&
    !youtubeEmbed &&
    !googleDriveId &&
    (isUploadedFile || /\.(mp4|webm|mov|ogg)(\?|$)/i.test(value));

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="label">Video (optional)</span>
        <div className="inline-flex overflow-hidden rounded-md border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setMode("link")}
            className={
              "px-3 py-1 " +
              (mode === "link"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-700 hover:bg-slate-50")
            }
          >
            Use link
          </button>
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={
              "px-3 py-1 " +
              (mode === "upload"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-700 hover:bg-slate-50")
            }
          >
            Upload file
          </button>
        </div>
      </div>

      {mode === "link" ? (
        <div>
          <input
            type="url"
            className="input"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
          />
          <p className="mt-1 text-xs text-slate-500">
            YouTube, Google Drive share link, or direct .mp4/.webm URL.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-white hover:file:bg-slate-800 disabled:opacity-60"
          />
          <p className="text-xs text-slate-500">
            mp4, webm, or mov. Max 100 MB.
          </p>
          {uploading && <p className="text-xs text-slate-600">Uploading…</p>}
          {uploadError && <p className="text-xs text-red-700">{uploadError}</p>}
          {isUploadedFile && !uploading && (
            <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              <span className="truncate">Uploaded: {value}</span>
              <button
                type="button"
                onClick={() => onChange("")}
                className="ml-3 text-red-700 hover:underline"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      )}

      {value && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-slate-500">Preview</div>
          {youtubeEmbed ? (
            <div
              className="overflow-hidden rounded-md border border-slate-200 bg-black"
              style={{ aspectRatio: "16 / 9" }}
            >
              <iframe
                src={youtubeEmbed}
                title="Video preview"
                allow="encrypted-media; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          ) : googleDriveId ? (
            <div
              className="overflow-hidden rounded-md border border-slate-200 bg-black"
              style={{ aspectRatio: "16 / 9" }}
            >
              <iframe
                src={`https://drive.google.com/file/d/${googleDriveId}/preview`}
                title="Video preview"
                allow="autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          ) : showDirectVideoPreview ? (
            <video
              src={value}
              controls
              preload="metadata"
              className="w-full rounded-md border border-slate-200 bg-black"
            />
          ) : isYouTube(value) ? (
            <p className="text-xs text-slate-500">Unrecognized YouTube URL.</p>
          ) : (
            <p className="text-xs text-slate-500">
              Link saved; preview not available.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
