import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { defaultLocale, isLocale, type Locale } from "./config";

/**
 * Resolves the active locale for each request from the NEXT_LOCALE cookie and
 * loads the matching message catalog. Runs on the server for every render, so
 * server components and the root layout always see the user's chosen language.
 */
export default getRequestConfig(async () => {
  const cookieValue = cookies().get("NEXT_LOCALE")?.value;
  const locale: Locale = isLocale(cookieValue) ? cookieValue : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
