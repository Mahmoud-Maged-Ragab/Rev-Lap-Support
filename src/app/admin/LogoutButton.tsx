"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function LogoutButton() {
  const router = useRouter();
  const t = useTranslations("adminNav");
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }
  return (
    <button onClick={logout} className="mt-1 w-full rounded px-2 py-1.5 text-start text-slate-600 hover:bg-slate-100 hover:text-ink-900">
      {t("signOut")}
    </button>
  );
}
