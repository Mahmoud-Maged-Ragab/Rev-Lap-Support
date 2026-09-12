"use client";

import { useMemo, useState } from "react";
import { IconBrandGoogleDrive } from "@tabler/icons-react";
import { driveEmbedUrl, driveThumbnailUrl, parseGoogleDriveUrl } from "@/lib/googleDrive";

/**
 * Shared "paste a Google Drive link" input used by every media element that
 * accepts one (Video / Image / PDF / Document — see AttachmentUploader.tsx
 * and VideoAttachmentField.tsx). Parses+previews entirely client-side; the
 * actual embed request is made by the viewer's own browser straight to
 * Google, never proxied through this app's server (see lib/googleDrive.ts).
 */
export function DriveLinkInput({
  kind,
  onAdd,
  busy = false,
}: {
  kind: "image" | "video" | "pdf" | "document";
  onAdd: (info: { url: string; fileId: string }) => void;
  busy?: boolean;
}) {
  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const parsed = useMemo(() => parseGoogleDriveUrl(value), [value]);
  const showError = touched && value.trim().length > 0 && !parsed;
  const kindLabel =
    kind === "pdf" ? "PDF" : kind === "video" ? "video" : kind === "document" ? "document" : "image";

  function handleChange(next: string) {
    setValue(next);
    setImgFailed(false);
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <IconBrandGoogleDrive
          size={15}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="url"
          inputMode="url"
          className="input !pl-8"
          placeholder="https://drive.google.com/file/d/…/view"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={() => setTouched(true)}
        />
      </div>
      {showError && (
        <p className="text-xs text-red-700">
          That doesn&apos;t look like a Google Drive link. Paste a share link such as
          https://drive.google.com/file/d/FILE_ID/view.
        </p>
      )}

      {parsed && (
        <div className="space-y-2">
          <div className="overflow-hidden rounded-md border border-slate-200 bg-slate-50">
            {kind === "image" ? (
              imgFailed ? (
                <div className="flex aspect-video w-full flex-col items-center justify-center gap-1 px-3 text-center text-xs text-slate-500">
                  <span>Preview unavailable.</span>
                  <span>
                    Make sure the file is shared as &quot;Anyone with the link can view&quot;.
                  </span>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={driveThumbnailUrl(parsed.id)}
                  alt="Google Drive preview"
                  className="max-h-56 w-full object-contain"
                  onError={() => setImgFailed(true)}
                />
              )
            ) : (
              <iframe
                key={parsed.id}
                src={driveEmbedUrl(parsed.id)}
                className="aspect-video w-full"
                allow="autoplay"
                title="Google Drive preview"
              />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={busy}
              onClick={() => {
                onAdd({ url: value.trim(), fileId: parsed.id });
                setValue("");
                setTouched(false);
                setImgFailed(false);
              }}
            >
              Add {kindLabel} link
            </button>
            <span className="text-xs text-slate-500">
              Private files won&apos;t preview or load for visitors — share the file first.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
