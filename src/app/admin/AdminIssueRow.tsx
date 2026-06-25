"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { IssueListItem } from "@/lib/issues";

export function AdminIssueRow({ issue }: { issue: IssueListItem }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (!confirm(`Delete "${issue.title}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/issues/${issue.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed to delete");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr>
      <td>
        <Link href={`/issues/${issue.slug}`} className="font-medium text-ink-900 hover:underline">
          {issue.title}
        </Link>
        <div className="text-xs text-slate-500">/{issue.slug}</div>
      </td>
      <td className="text-slate-600">
        {issue.creator?.email ?? <span className="text-slate-400">—</span>}
      </td>
      <td>{issue.category?.name ?? <span className="text-slate-400">—</span>}</td>
      <td>{issue.views.toLocaleString()}</td>
      <td className="text-slate-600">
        {new Date(issue.updatedAt).toLocaleDateString(undefined, {
          year: "numeric", month: "short", day: "numeric",
        })}
      </td>
      <td className="text-right">
        <div className="inline-flex gap-1.5">
          <Link href={`/admin/issues/${issue.id}/edit`} className="btn !h-7 !px-2 !text-xs">Edit</Link>
          <button onClick={onDelete} className="btn btn-danger !h-7 !px-2 !text-xs" disabled={busy}>
            {busy ? "…" : "Delete"}
          </button>
        </div>
      </td>
    </tr>
  );
}
