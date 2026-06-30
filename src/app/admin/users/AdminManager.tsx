"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  normalizeRole,
  assignableRoles,
  canManageTarget,
  type Role,
} from "@/lib/permissions";

function roleKey(role: Role): "owner" | "admin" | "support" {
  if (role === "OWNER") return "owner";
  if (role === "ADMIN") return "admin";
  return "support";
}

type Row = {
  id: string;
  email: string;
  role: Role;
  disabled: boolean;
  createdAt: string;
};

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
  actorRole,
}: {
  initial: Row[];
  currentAdminId: string | null;
  actorRole: Role;
}) {
  const router = useRouter();
  const t = useTranslations("users");
  const tr = useTranslations("roles");
  const creatable = assignableRoles(actorRole);
  const [rows, setRows] = useState<Row[]>(initial);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(creatable[0] ?? "SUPPORT");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
      if (!res.ok) throw new Error(data.error ?? t("createFailed"));
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
      setRole(creatable[0] ?? "SUPPORT");
      setNotice(t("createdSuccess", { email: data.email }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("createFailed"));
    } finally {
      setCreating(false);
    }
  }

  async function remove(id: string, email: string) {
    if (!confirm(t("confirmDelete", { email }))) return;
    setDeletingId(id);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admins/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? t("deleteFailed"));
      setRows((prev) => prev.filter((row) => row.id !== id));
      setNotice(t("deletedSuccess", { email }));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={create}
        className="space-y-4 rounded-md border border-slate-200 p-4"
      >
        <div>
          <h2 className="text-sm font-semibold">{t("createUser")}</h2>
          <p className="text-xs text-slate-500">{t("createUserHint")}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="email">
              {t("email")}
            </label>
            <input
              id="email"
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              autoComplete="off"
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              {t("password")}
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("passwordPlaceholder")}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label" htmlFor="role">
              {t("role")}
            </label>
            <select
              id="role"
              className="select"
              value={role}
              onChange={(e) => setRole(normalizeRole(e.target.value))}
            >
              {creatable.map((r) => (
                <option key={r} value={r}>
                  {tr(roleKey(r))}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <button type="submit" className="btn btn-primary" disabled={creating}>
            {creating ? t("creating") : t("createButton")}
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
              <th>{t("colEmail")}</th>
              <th className="w-32">{t("colRole")}</th>
              <th className="w-40">{t("colCreated")}</th>
              <th className="w-28 text-end">{t("colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-500">
                  {t("noUsers")}
                </td>
              </tr>
            )}
            {rows.map((a) => {
              const isSelf = a.id === currentAdminId;
              const canManage = canManageTarget(actorRole, a.role);
              return (
                <tr key={a.id}>
                  <td>
                    <div className="font-medium">{a.email}</div>
                    {isSelf && (
                      <div className="text-xs text-slate-500">{t("you")}</div>
                    )}
                    {a.disabled && (
                      <div className="text-xs font-medium text-red-600">
                        {t("disabledBadge")}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="chip">{tr(roleKey(a.role))}</span>
                  </td>
                  <td>{fmt(a.createdAt)}</td>
                  <td className="text-end">
                    {isSelf ? (
                      <span className="text-xs text-slate-400">{t("current")}</span>
                    ) : canManage ? (
                      <button
                        type="button"
                        className="btn btn-danger !h-7 !px-2 !text-xs"
                        onClick={() => remove(a.id, a.email)}
                        disabled={deletingId === a.id}
                      >
                        {deletingId === a.id ? "…" : t("delete")}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
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
