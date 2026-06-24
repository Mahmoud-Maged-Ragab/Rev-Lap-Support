"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }
  return (
    <button onClick={logout} className="mt-1 w-full rounded px-2 py-1.5 text-left text-slate-600 hover:bg-slate-100 hover:text-ink-900">
      Sign out
    </button>
  );
}
