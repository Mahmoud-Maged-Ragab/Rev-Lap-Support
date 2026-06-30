import { getTranslations } from "next-intl/server";
import { selectAll } from "@/lib/supabase";
import { requireUserManagement } from "@/lib/guards";
import { normalizeRole } from "@/lib/permissions";
import { AdminManager } from "./AdminManager";

export const dynamic = "force-dynamic";

type AdminRow = {
  id: string;
  email: string;
  role: string;
  disabled?: boolean | null;
  createdAt: string;
};

export default async function AdminUsersPage() {
  const session = await requireUserManagement();
  const t = await getTranslations("users");

  const admins = await selectAll<AdminRow>("admins", {
    select: "id,email,role,disabled,createdAt",
    order: "createdAt.asc",
  });

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-slate-500">{t("subtitle")}</p>
      </div>
      <AdminManager
        currentAdminId={session.sub}
        actorRole={normalizeRole(session.role)}
        initial={admins.map((a) => ({
          id: a.id,
          email: a.email,
          role: normalizeRole(a.role),
          disabled: !!a.disabled,
          createdAt: new Date(a.createdAt).toISOString(),
        }))}
      />
    </div>
  );
}
