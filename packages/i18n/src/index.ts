import i18n, { type ResourceLanguage } from "i18next";
import { initReactI18next } from "react-i18next";

import enAttributes from "./locales/en/attributes.json";
import enAuthentication from "./locales/en/authentication.json";
import enCommon from "./locales/en/common.json";
import enFeatureInfo from "./locales/en/featureInfo.json";
import enLayers from "./locales/en/layers.json";
import enMap from "./locales/en/map.json";
import enMaps from "./locales/en/maps.json";
import enUpload from "./locales/en/upload.json";
import ptBrAttributes from "./locales/pt-BR/attributes.json";
import ptBrAuthentication from "./locales/pt-BR/authentication.json";
import ptBrCommon from "./locales/pt-BR/common.json";
import ptBrFeatureInfo from "./locales/pt-BR/featureInfo.json";
import ptBrLayers from "./locales/pt-BR/layers.json";
import ptBrMap from "./locales/pt-BR/map.json";
import ptBrMaps from "./locales/pt-BR/maps.json";
import ptBrUpload from "./locales/pt-BR/upload.json";

export const supportedLocales = ["en", "pt-BR"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

export const fallbackLocale: SupportedLocale = "en";
export const localeStorageKey = "mirante.locale";

export const translationResources = {
  en: {
    attributes: enAttributes,
    authentication: enAuthentication,
    common: enCommon,
    featureInfo: enFeatureInfo,
    layers: enLayers,
    map: enMap,
    maps: enMaps,
    upload: enUpload,
  },
  "pt-BR": {
    attributes: ptBrAttributes,
    authentication: ptBrAuthentication,
    common: ptBrCommon,
    featureInfo: ptBrFeatureInfo,
    layers: ptBrLayers,
    map: ptBrMap,
    maps: ptBrMaps,
    upload: ptBrUpload,
  },
} as const;

function normalizeLocale(locale: string): SupportedLocale | undefined {
  const normalizedLocale = locale.toLowerCase();

  if (normalizedLocale === "pt" || normalizedLocale.startsWith("pt-")) {
    return "pt-BR";
  }

  if (normalizedLocale === "en" || normalizedLocale.startsWith("en-")) {
    return "en";
  }

  return undefined;
}

export function detectInitialLocale(
  storedLocale: string | null,
  browserLocales: readonly string[],
): SupportedLocale {
  if (storedLocale) {
    const supportedStoredLocale = normalizeLocale(storedLocale);

    if (supportedStoredLocale) {
      return supportedStoredLocale;
    }
  }

  for (const browserLocale of browserLocales) {
    const supportedBrowserLocale = normalizeLocale(browserLocale);

    if (supportedBrowserLocale) {
      return supportedBrowserLocale;
    }
  }

  return fallbackLocale;
}

function getStoredLocale(): string | null {
  try {
    return globalThis.localStorage?.getItem(localeStorageKey) ?? null;
  } catch {
    return null;
  }
}

function getBrowserLocales(): readonly string[] {
  return globalThis.navigator?.languages ?? [];
}

function setDocumentLocale(locale: SupportedLocale): void {
  if (globalThis.document) {
    globalThis.document.documentElement.lang = locale;
  }
}

const initialLocale = detectInitialLocale(
  getStoredLocale(),
  getBrowserLocales(),
);

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    fallbackLng: fallbackLocale,
    lng: initialLocale,
    defaultNS: "common",
    ns: [
      "attributes",
      "authentication",
      "common",
      "featureInfo",
      "layers",
      "map",
      "maps",
      "upload",
    ],
    resources: translationResources,
    interpolation: {
      escapeValue: false,
    },
  });
}

setDocumentLocale(initialLocale);

export async function changeLocale(locale: SupportedLocale): Promise<void> {
  await i18n.changeLanguage(locale);
  setDocumentLocale(locale);

  try {
    globalThis.localStorage?.setItem(localeStorageKey, locale);
  } catch {
    // Browsers may deny storage access; runtime language switching still works.
  }
}

export function getActiveLocale(): SupportedLocale {
  return (
    normalizeLocale(i18n.resolvedLanguage ?? i18n.language) ?? fallbackLocale
  );
}

export function configureI18n({
  fallbackLocale: configuredFallbackLocale,
  supportedLocales: configuredSupportedLocales,
}: {
  fallbackLocale: SupportedLocale;
  supportedLocales: readonly SupportedLocale[];
}): void {
  i18n.options.fallbackLng = [configuredFallbackLocale];

  if (!configuredSupportedLocales.includes(getActiveLocale())) {
    void i18n.changeLanguage(configuredFallbackLocale);
    setDocumentLocale(configuredFallbackLocale);
  }
}

export function formatDate(
  value: Date | number | string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
  locale = getActiveLocale(),
): string {
  return new Intl.DateTimeFormat(locale, options).format(new Date(value));
}

export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
  locale = getActiveLocale(),
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatFileSize(
  bytes: number,
  locale = getActiveLocale(),
): string {
  const units = ["B", "KB", "MB", "GB", "TB"] as const;
  const safeBytes = Math.max(0, bytes);
  const unitIndex = Math.min(
    Math.floor(Math.log(Math.max(safeBytes, 1)) / Math.log(1024)),
    units.length - 1,
  );
  const value = safeBytes / 1024 ** unitIndex;

  return `${formatNumber(value, { maximumFractionDigits: unitIndex === 0 ? 0 : 1 }, locale)} ${units[unitIndex]}`;
}

function collectLeafKeys(
  value: Record<string, unknown>,
  prefix = "",
): string[] {
  return Object.entries(value).flatMap(([key, childValue]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    if (
      childValue !== null &&
      typeof childValue === "object" &&
      !Array.isArray(childValue)
    ) {
      return collectLeafKeys(childValue as Record<string, unknown>, path);
    }

    return path;
  });
}

export function findMissingTranslationKeys(
  reference: ResourceLanguage,
  candidate: ResourceLanguage,
): string[] {
  const candidateKeys = new Set(collectLeafKeys(candidate));
  return collectLeafKeys(reference).filter((key) => !candidateKeys.has(key));
}

export function registerTranslationBundle(
  locale: SupportedLocale,
  namespace: string,
  resources: ResourceLanguage,
): void {
  i18n.addResourceBundle(locale, namespace, resources, true, false);
}

export { i18n };
