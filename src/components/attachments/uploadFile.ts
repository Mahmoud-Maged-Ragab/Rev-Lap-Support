export type UploadResult = {
  path: string;
  filename: string;
  mime: string;
  size: number;
  kind: string;
};

/**
 * POSTs a file to /api/upload via XMLHttpRequest (not fetch) specifically to
 * get real `upload.onprogress` byte-level progress — fetch has no upload
 * progress API. Used by AttachmentUploader and VideoAttachmentField so
 * every attachment shows genuine "Uploading… NN%" feedback, never a faked
 * progress animation.
 */
export function uploadFileWithProgress(
  file: File,
  onProgress: (percent: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // non-JSON error body — fall through with empty data
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as unknown as UploadResult);
      } else {
        reject(new Error(typeof data.error === "string" ? data.error : `Upload failed (${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));

    const fd = new FormData();
    fd.append("file", file);
    xhr.send(fd);
  });
}
