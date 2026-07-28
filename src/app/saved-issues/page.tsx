import { getLocale, getTranslations } from "next-intl/server";
import { SavedIssuesList } from "@/components/SavedIssuesList";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SavedIssuesPage() {
  const t = await getTranslations("savedIssues");
  const locale = await getLocale();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-slate-500">{t("subtitle")}</p>
        </div>
        <Link href="/" className="btn">
          {t("browseAll")}
        </Link>
      </div>

      <SavedIssuesList locale={locale} />
    </div>
  );
}
