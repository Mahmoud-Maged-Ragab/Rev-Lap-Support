// Gives next-intl full type-safety: message keys are derived from the English
// catalog, so `t("…")` calls are checked at compile time.
import type en from "../messages/en.json";

type Messages = typeof en;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface IntlMessages extends Messages {}
}
