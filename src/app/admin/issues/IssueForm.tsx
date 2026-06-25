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
  const [newLink, setNewLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(initial?.id);

  function toggleTag(id: string) {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addLink() {
    const trimmed = newLink.trim();
    if (!trimmed) return;
    try {
      new URL(trimmed);
    } catch {
      setError("Please enter a valid URL.");
      return;
    }
    if (images.includes(trimmed)) {
      setError("This link is already added.");
      return;
    }
    setImages((prev) => [...prev, trimmed]);
    setNewLink("");
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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

      <label className="label">PDF links</label>

      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <input
            type="url"
            className="input flex-1"
            value={newLink}
            onChange={(e) => setNewLink(e.target.value)}
            placeholder="https://drive.google.com/file/d/..."
          />
          <button
            type="button"
            className="btn btn-outline w-fit"
            onClick={addLink}
          >
            Add link
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Enter Google Drive PDF share links or direct PDF URLs. Click Add to save each link.
        </p>

        {images.length > 0 && (
          <div className="flex flex-col gap-2">
            {images.map((url, idx) => (
              <div
                key={`${url}-${idx}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              >
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-blue-600 hover:underline"
                >
                  {url}
                </a>
                <button
                  type="button"
                  className="text-sm text-red-700 hover:underline"
                  onClick={() =>
                    setImages((prev) => prev.filter((_, i) => i !== idx))
                  }
                >
                  Remove
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
          disabled={saving}
        >
          {saving ? "Saving…" : isEdit ? "Save changes" : "Create issue"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn">
          Cancel
        </button>
      </div>
    </form>
  );
}
