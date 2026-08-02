"use client";

import { useTranslations } from "next-intl";

export default function HistoryError({ reset }: { reset: () => void }) {
  const t = useTranslations("history");
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-6 text-center">
      <p className="text-sm font-medium text-red-700">{t("loadFailed")}</p>
      <button type="button" className="btn mt-3" onClick={() => reset()}>
        {t("retry")}
      </button>
    </div>
  );
}
