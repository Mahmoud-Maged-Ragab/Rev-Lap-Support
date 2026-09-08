"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconPencil, IconTrash } from "@tabler/icons-react";

/**
 * Edit/delete controls shown on the public issue detail page, gated by the
 * viewer's permissions (resolved server-side by the page — this component
 * only renders when the caller has already decided the viewer may manage
 * content).
 */
export function IssueManageCard({
  issueId,
  title,
}: {
  issueId: string;
  title: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/issues/${issueId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete");
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border border-slate-200 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Manage
      </div>
      <div className="mt-2 flex gap-2">
        <Link
          href={`/admin/issues/${issueId}/edit`}
          className="btn btn-outline btn-sm flex-1"
        >
          <IconPencil size={14} className="mr-1.5" /> Edit
        </Link>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="btn btn-danger btn-sm flex-1"
        >
          <IconTrash size={14} className="mr-1.5" /> {busy ? "…" : "Delete"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}
