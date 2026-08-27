import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "./locales/en/common.json";
import ptBrCommon from "./locales/pt-BR/common.json";

export const supportedLocales = ["en", "pt-BR"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

const resources = {
  en: { common: enCommon },
  "pt-BR": { common: ptBrCommon },
} as const;

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    fallbackLng: "en",
    lng: "en",
    defaultNS: "common",
    resources,
    interpolation: {
      escapeValue: false,
    },
  });
}

export { i18n };
