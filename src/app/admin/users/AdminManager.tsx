"use client";

import { useState } from "react";

type Role = "ADMIN" | "SUPPORT";
type Row = { id: string; email: string; role: Role; createdAt: string };

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AdminManager({
  initial,
  currentAdminId,
}: {
  initial: Row[];
  currentAdminId: string | null;
}) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("SUPPORT");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admins", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to create admin");
      setRows((prev) => [
        ...prev,
        { id: data.id, email: data.email, role: data.role, createdAt: data.createdAt },
      ]);
      setEmail("");
      setPassword("");
      setRole("SUPPORT");
      setNotice(`Admin "${data.email}" created.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create admin");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={create}
        className="space-y-4 rounded-md border border-slate-200 p-4"
      >
        <div>
          <h2 className="text-sm font-semibold">Create user</h2>
          <p className="text-xs text-slate-500">
            New users can sign in immediately after creation.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label" htmlFor="role">
              Role
            </label>
            <select
              id="role"
              className="select"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="SUPPORT">Support member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        </div>
        <div>
          <button type="submit" className="btn btn-primary" disabled={creating}>
            {creating ? "Creating…" : "Create user"}
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      <div className="overflow-hidden rounded-md border border-slate-200">
        <table className="table w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th>Email</th>
              <th className="w-32">Role</th>
              <th className="w-40">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-slate-500">
                  No users.
                </td>
              </tr>
            )}
            {rows.map((a) => {
              const isSelf = a.id === currentAdminId;
              return (
                <tr key={a.id}>
                  <td>
                    <div className="font-medium">{a.email}</div>
                    {isSelf && (
                      <div className="text-xs text-slate-500">You</div>
                    )}
                  </td>
                  <td>
                    <span className="chip">
                      {a.role === "ADMIN" ? "Admin" : "Support"}
                    </span>
                  </td>
                  <td>{fmt(a.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
