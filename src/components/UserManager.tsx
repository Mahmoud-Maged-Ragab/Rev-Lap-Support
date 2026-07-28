"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  normalizeRole,
  assignableRoles,
  canManageTarget,
  canChangeRoles,
  type Role,
} from "@/lib/permissions";

function roleKey(role: Role): "owner" | "admin" | "support" {
  if (role === "OWNER") return "owner";
  if (role === "ADMIN") return "admin";
  return "support";
}

export type UserRow = {
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

/**
 * Shared user-management panel used by both the Owner and Admin dashboards.
 * Everything the actor may do is derived from `actorRole` via the central
 * permission helpers — the component itself contains no role-specific branches
 * beyond those checks, so both dashboards render the exact same code.
 */
export function UserManager({
  initial,
  currentAdminId,
  actorRole,
}: {
  initial: UserRow[];
  currentAdminId: string | null;
  actorRole: Role;
}) {
  const router = useRouter();
  const t = useTranslations("users");
  const tr = useTranslations("roles");
  // Roles this actor may assign (create form + role select). OWNER is never
  // in this list — owner accounts are created only by manual database setup.
  const creatable = assignableRoles(actorRole);
  const mayChangeRoles = canChangeRoles(actorRole);
  const [rows, setRows] = useState<UserRow[]>(initial);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(creatable[0] ?? "SUPPORT");
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

  async function patch(
    id: string,
    body: Record<string, unknown>,
    okMsg: string,
  ) {
    setBusyId(id);
    reset();
    try {
      const res = await fetch(`/api/admins/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? t("updateFailed"));
      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                role: data.role ? normalizeRole(data.role) : r.role,
                disabled:
                  typeof data.disabled === "boolean"
                    ? data.disabled
                    : r.disabled,
              }
            : r,
        ),
      );
      setNotice(okMsg);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("updateFailed"));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string, email: string) {
    if (!confirm(t("confirmDelete", { email }))) return;
    setBusyId(id);
    reset();
    try {
      const res = await fetch(`/api/admins/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? t("deleteFailed"));
      setRows((prev) => prev.filter((r) => r.id !== id));
      setNotice(t("deletedSuccess", { email }));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("deleteFailed"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      {creatable.length > 0 && (
        <form
          onSubmit={create}
          className="space-y-4 rounded-md border border-slate-200 bg-white p-4"
        >
          <div>
            <h2 className="text-sm font-semibold">{t("createUser")}</h2>
            <p className="text-xs text-slate-500">{t("createUserHint")}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="user-email">
                {t("email")}
              </label>
              <input
                id="user-email"
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
              <label className="label" htmlFor="user-password">
                {t("password")}
              </label>
              <input
                id="user-password"
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
              <label className="label" htmlFor="user-role">
                {t("role")}
              </label>
              <select
                id="user-role"
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
            <button
              type="submit"
              className="btn btn-primary"
              disabled={creating}
            >
              {creating ? t("creating") : t("createButton")}
            </button>
          </div>
        </form>
      )}

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
              <th className="w-40">{t("colRole")}</th>
              <th className="w-32">{t("colCreated")}</th>
              <th className="w-48 text-end">{t("colActions")}</th>
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
            {rows.map((u) => {
              const isSelf = u.id === currentAdminId;
              const canManage = canManageTarget(actorRole, u.role);
              const busy = busyId === u.id;
              // Role select appears only for actors who may change roles
              // (OWNER) and only on rows they may manage.
              const canEditRole = mayChangeRoles && canManage && !isSelf;
              return (
                <tr key={u.id}>
                  <td>
                    <div className="font-medium">{u.email}</div>
                    {isSelf && (
                      <div className="text-xs text-slate-500">{t("you")}</div>
                    )}
                    {u.disabled && (
                      <div className="text-xs font-medium text-red-600">
                        {t("disabledBadge")}
                      </div>
                    )}
                  </td>
                  <td>
                    {canEditRole ? (
                      <select
                        className="select !h-8 !py-0 text-xs"
                        value={u.role}
                        disabled={busy}
                        onChange={(e) =>
                          patch(
                            u.id,
                            { role: e.target.value },
                            t("roleUpdatedSuccess", { email: u.email }),
                          )
                        }
                      >
                        {creatable.map((r) => (
                          <option key={r} value={r}>
                            {tr(roleKey(r))}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="chip">{tr(roleKey(u.role))}</span>
                    )}
                  </td>
                  <td>{fmt(u.createdAt)}</td>
                  <td className="text-end">
                    {isSelf ? (
                      <span className="text-xs text-slate-400">
                        {t("current")}
                      </span>
                    ) : canManage ? (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="btn !h-7 !px-2 !text-xs"
                          disabled={busy}
                          onClick={() =>
                            patch(
                              u.id,
                              { disabled: !u.disabled },
                              u.disabled
                                ? t("enabledSuccess", { email: u.email })
                                : t("disabledSuccess", { email: u.email }),
                            )
                          }
                        >
                          {busy ? "…" : u.disabled ? t("enable") : t("disable")}
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger !h-7 !px-2 !text-xs"
                          disabled={busy}
                          onClick={() => remove(u.id, u.email)}
                        >
                          {busy ? "…" : t("delete")}
                        </button>
                      </div>
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
