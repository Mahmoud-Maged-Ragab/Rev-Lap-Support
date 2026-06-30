import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireContentAccess } from "@/lib/guards";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  await requireContentAccess();
  const t = await getTranslations("content");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-slate-500">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/admin/content/issues" className="rounded-md border border-slate-200 bg-white p-4 hover:bg-slate-50">
          <div className="font-medium text-ink-900">{t("issues")}</div>
          <div className="mt-1 text-sm text-slate-500">{t("issuesDesc")}</div>
        </Link>
        <Link href="/admin/categories" className="rounded-md border border-slate-200 bg-white p-4 hover:bg-slate-50">
          <div className="font-medium text-ink-900">{t("categories")}</div>
          <div className="mt-1 text-sm text-slate-500">{t("categoriesDesc")}</div>
        </Link>
        <Link href="/admin/tags" className="rounded-md border border-slate-200 bg-white p-4 hover:bg-slate-50">
          <div className="font-medium text-ink-900">{t("tags")}</div>
          <div className="mt-1 text-sm text-slate-500">{t("tagsDesc")}</div>
        </Link>
      </div>
    </div>
  );
}
