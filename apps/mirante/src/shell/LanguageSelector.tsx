import {
  changeLocale,
  getActiveLocale,
  type SupportedLocale,
} from "@mirante/i18n";
import type { ChangeEvent } from "react";
import { useTranslation } from "react-i18next";

interface LanguageSelectorProps {
  locales: readonly { id: SupportedLocale; label: string }[];
}

export function LanguageSelector({ locales }: LanguageSelectorProps) {
  const { t } = useTranslation("common");
  const activeLocale = getActiveLocale();
  const localeIds = locales.map((locale) => locale.id);
  const selectedLocale = localeIds.includes(activeLocale)
    ? activeLocale
    : locales[0]?.id;

  function handleLocaleChange(event: ChangeEvent<HTMLSelectElement>): void {
    const locale = event.currentTarget.value;

    if (localeIds.includes(locale)) {
      void changeLocale(locale);
    }
  }

  return (
    <label className="language-selector">
      <span className="visually-hidden">{t("shell.language.label")}</span>
      <select
        aria-label={t("shell.language.label")}
        value={selectedLocale}
        onChange={handleLocaleChange}
      >
        {locales.map((locale) => (
          <option key={locale.id} value={locale.id}>
            {locale.label}
          </option>
        ))}
      </select>
    </label>
  );
}
