"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { VideoField } from "./VideoField";

export type IssueFormInitial = {
  id?: string;
  title?: string;
  description?: string;
  errorMessage?: string | null;
  solution?: string;
  categoryId?: string | null;
  tags?: { id: string; name: string }[];
  images?: string[];
  videoUrl?: string | null;
};

type TagOption = { id: string; name: string };

export function IssueForm({
  initial,
  categories,
  allTags,
}: {
  initial?: IssueFormInitial;
  categories: { id: string; name: string }[];
  allTags: TagOption[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [errorMessage, setErrorMessage] = useState(initial?.errorMessage ?? "");
  const [solution, setSolution] = useState(initial?.solution ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(
    () => new Set((initial?.tags ?? []).map((t) => t.id)),
  );
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const isEdit = Boolean(initial?.id);

  function toggleTag(id: string) {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const files = Array.from(input.files ?? []);
    if (files.length === 0) return;

    setUploading(true);
    setError(null);

    const uploadedUrls: string[] = [];
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || typeof data.url !== "string") {
          throw new Error(data.error ?? `Upload failed for ${file.name}`);
        }
        uploadedUrls.push(data.url);
      }
      setImages((prev) => [...prev, ...uploadedUrls]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      input.value = "";
    }
  }

  function isPdfUrl(url: string) {
    try {
      const clean = new URL(url).pathname;
      return clean.toLowerCase().endsWith(".pdf");
    } catch {
      return false;
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (uploading) {
      setError("Please wait for uploads to finish before saving.");
      return;
    }
    if (selectedTagIds.size === 0) {
      setError("Please select at least one tag.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title,
        description,
        errorMessage: errorMessage || null,
        solution,
        categoryId: categoryId || null,
        tagIds: Array.from(selectedTagIds),
        images: images,
        videoUrl: videoUrl.trim() || null,
      };
      const url = isEdit ? `/api/issues/${initial!.id}` : "/api/issues";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Save failed");
      }
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label className="label" htmlFor="title">
          Title
        </label>
        <input
          id="title"
          className="input"
          required
          minLength={3}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="description">
          Problem description
        </label>
        <textarea
          id="description"
          className="textarea"
          required
          minLength={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="errorMessage">
          Error message (optional)
        </label>
        <textarea
          id="errorMessage"
          className="textarea font-mono text-xs"
          value={errorMessage ?? ""}
          onChange={(e) => setErrorMessage(e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="solution">
          Solution / fix steps
        </label>
        <textarea
          id="solution"
          className="textarea min-h-[180px]"
          required
          minLength={5}
          value={solution}
          onChange={(e) => setSolution(e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="category">
          Category
        </label>
        <select
          id="category"
          className="select"
          value={categoryId ?? ""}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">— None —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <span className="label">Tags</span>
          <span className="text-xs text-slate-500">
            {selectedTagIds.size} selected
          </span>
        </div>
        {allTags.length === 0 ? (
          <p className="text-sm text-slate-500">
            No tags yet. Create some in the Tags page first.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 rounded-md border border-slate-200 p-3">
            {allTags.map((t) => {
              const active = selectedTagIds.has(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTag(t.id)}
                  aria-pressed={active}
                  className={
                    "rounded-full border px-3 py-1 text-xs font-medium transition " +
                    (active
                      ? "border-accent bg-accent text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50")
                  }
                >
                  {t.name}
                </button>
              );
            })}
          </div>
        )}
        <p className="mt-1 text-xs text-slate-500">
          Click to toggle. At least one tag is required.
        </p>
      </div>

      <label className="label">Images / PDFs</label>

      <div className="flex flex-col gap-3">
        <input
          id="images"
          type="file"
          accept="image/*,.pdf"
          multiple
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />

        <button
          type="button"
          className="btn btn-outline w-fit"
          disabled={uploading}
          onClick={() => document.getElementById("images")?.click()}
        >
          {uploading ? "Uploading…" : "📷 Choose files"}
        </button>

        {images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {images.map((url, idx) => (
              <div key={`${url}-${idx}`} className="relative">
                {isPdfUrl(url) ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-20 w-20 flex-col items-center justify-center rounded-lg border bg-slate-50 text-[10px] font-medium text-blue-600 hover:bg-slate-100"
                  >
                    <span className="text-2xl leading-none">📄</span>
                    <span className="mt-1">PDF</span>
                  </a>
                ) : (
                  <img
                    src={url}
                    alt={`Attachment ${idx + 1}`}
                    className="h-20 w-20 rounded-lg border object-cover"
                  />
                )}

                <button
                  type="button"
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-xs text-white"
                  onClick={() =>
                    setImages((prev) => prev.filter((_, i) => i !== idx))
                  }
                  aria-label="Remove attachment"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <VideoField value={videoUrl ?? ""} onChange={setVideoUrl} />

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-slate-200 pt-4">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={saving || uploading}
        >
          {saving ? "Saving…" : isEdit ? "Save changes" : "Create issue"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn">
          Cancelsdad
        </button>
      </div>
    </form>
  );
}
