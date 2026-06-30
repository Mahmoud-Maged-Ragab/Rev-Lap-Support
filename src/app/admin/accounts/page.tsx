import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireUserManagement } from "@/lib/guards";

export const dynamic = "force-dynamic";

export default async function AdminAccountsPage() {
  await requireUserManagement();
  const t = await getTranslations("accounts");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-slate-500">{t("subtitle")}</p>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600">{t("body")}</p>
        <div className="mt-4">
          <Link href="/admin/users" className="btn btn-primary">
            {t("openList")}
          </Link>
        </div>
      </div>
    </div>
  );
}
