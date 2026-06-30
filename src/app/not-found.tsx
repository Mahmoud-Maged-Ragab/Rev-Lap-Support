import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <p className="mt-2 text-sm text-slate-600">{t("body")}</p>
      <Link href="/" className="btn mt-5">
        {t("back")}
      </Link>
    </div>
  );
}
