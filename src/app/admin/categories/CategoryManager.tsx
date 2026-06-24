"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Row = { id: string; name: string; count: number };

export function CategoryManager({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed");
      }
      setName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string, n: string) {
    if (!confirm(`Delete category "${n}"?`)) return;
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error ?? "Failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <form onSubmit={add} className="flex gap-2">
        <input className="input max-w-sm" placeholder="New category name"
               value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
        <button className="btn btn-primary" disabled={busy}>Add</button>
      </form>
      {error && <div className="text-sm text-red-700">{error}</div>}

      <div className="overflow-hidden rounded-md border border-slate-200">
        <table className="table w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th>Name</th>
              <th className="w-32">Issues</th>
              <th className="w-32 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {initial.length === 0 && (
              <tr><td colSpan={3} className="py-8 text-center text-slate-500">No categories.</td></tr>
            )}
            {initial.map((c) => (
              <tr key={c.id}>
                <td>
                  <div className="font-medium">{c.name}</div>
                </td>
                <td>{c.count}</td>
                <td className="text-right">
                  <button onClick={() => remove(c.id, c.name)} className="btn btn-danger !h-7 !px-2 !text-xs">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
