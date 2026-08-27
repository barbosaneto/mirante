import {
  changeLocale,
  getActiveLocale,
  type SupportedLocale,
} from "@mirante/i18n";
import type { ChangeEvent } from "react";
import { useTranslation } from "react-i18next";

interface LanguageSelectorProps {
  locales: readonly SupportedLocale[];
}

export function LanguageSelector({ locales }: LanguageSelectorProps) {
  const { t } = useTranslation("common");
  const activeLocale = getActiveLocale();
  const selectedLocale = locales.includes(activeLocale)
    ? activeLocale
    : locales[0];

  function handleLocaleChange(event: ChangeEvent<HTMLSelectElement>): void {
    const locale = event.currentTarget.value as SupportedLocale;

    if (locales.includes(locale)) {
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
          <option key={locale} value={locale}>
            {t(`shell.language.${locale}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
