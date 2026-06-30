"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  normalizeRole,
  roleLabel,
  assignableRoles,
  type Role,
} from "@/lib/permissions";

type Row = {
  id: string;
  email: string;
  role: Role;
  disabled: boolean;
  createdAt: string;
};

// Owners can assign these roles. OWNER is intentionally absent — owner accounts
// are created only by manual database setup, never through the UI/API.
const CREATABLE: Role[] = assignableRoles("OWNER");

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function OwnerUserManager({
  initial,
  currentAdminId,
}: {
  initial: Row[];
  currentAdminId: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initial);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(CREATABLE[0] ?? "SUPPORT");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function reset() {
    setError(null);
    setNotice(null);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    reset();
    try {
      const res = await fetch("/api/admins", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to create user");
      setRows((prev) => [
        ...prev,
        {
          id: data.id,
          email: data.email,
          role: normalizeRole(data.role),
          disabled: !!data.disabled,
          createdAt: data.createdAt,
        },
      ]);
      setEmail("");
      setPassword("");
      setRole(CREATABLE[0] ?? "SUPPORT");
      setNotice(`User "${data.email}" created.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>, okMsg: string) {
    setBusyId(id);
    reset();
    try {
      const res = await fetch(`/api/admins/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                role: data.role ? normalizeRole(data.role) : r.role,
                disabled:
                  typeof data.disabled === "boolean" ? data.disabled : r.disabled,
              }
            : r,
        ),
      );
      setNotice(okMsg);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string, email: string) {
    if (!confirm(`Delete account "${email}"? This cannot be undone.`)) return;
    setBusyId(id);
    reset();
    try {
      const res = await fetch(`/api/admins/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to delete account");
      setRows((prev) => prev.filter((r) => r.id !== id));
      setNotice(`Account "${email}" deleted.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={create}
        className="space-y-4 rounded-md border border-slate-200 bg-white p-4"
      >
        <div>
          <h3 className="text-sm font-semibold">Create user</h3>
          <p className="text-xs text-slate-500">
            Owners can create Admin and Support accounts.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="owner-email">
              Email
            </label>
            <input
              id="owner-email"
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
            <label className="label" htmlFor="owner-password">
              Password
            </label>
            <input
              id="owner-password"
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
            <label className="label" htmlFor="owner-role">
              Role
            </label>
            <select
              id="owner-role"
              className="select"
              value={role}
              onChange={(e) => setRole(normalizeRole(e.target.value))}
            >
              {CREATABLE.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
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
              <th className="w-40">Role</th>
              <th className="w-32">Created</th>
              <th className="w-48 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-500">
                  No users.
                </td>
              </tr>
            )}
            {rows.map((u) => {
              const isSelf = u.id === currentAdminId;
              const isOwner = u.role === "OWNER";
              const busy = busyId === u.id;
              return (
                <tr key={u.id}>
                  <td>
                    <div className="font-medium">{u.email}</div>
                    {isSelf && <div className="text-xs text-slate-500">You</div>}
                    {u.disabled && (
                      <div className="text-xs font-medium text-red-600">Disabled</div>
                    )}
                  </td>
                  <td>
                    {isOwner ? (
                      // Owner rows are not editable from the UI.
                      <span className="chip">{roleLabel(u.role)}</span>
                    ) : (
                      <select
                        className="select !h-8 !py-0 text-xs"
                        value={u.role}
                        disabled={busy}
                        onChange={(e) =>
                          patch(
                            u.id,
                            { role: e.target.value },
                            `Role for "${u.email}" updated.`,
                          )
                        }
                      >
                        {CREATABLE.map((r) => (
                          <option key={r} value={r}>
                            {roleLabel(r)}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td>{fmt(u.createdAt)}</td>
                  <td className="text-right">
                    {isSelf ? (
                      <span className="text-xs text-slate-400">Current</span>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="btn !h-7 !px-2 !text-xs"
                          disabled={busy}
                          onClick={() =>
                            patch(
                              u.id,
                              { disabled: !u.disabled },
                              `Account "${u.email}" ${
                                u.disabled ? "enabled" : "disabled"
                              }.`,
                            )
                          }
                        >
                          {busy ? "…" : u.disabled ? "Enable" : "Disable"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger !h-7 !px-2 !text-xs"
                          disabled={busy}
                          onClick={() => remove(u.id, u.email)}
                        >
                          {busy ? "…" : "Delete"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
