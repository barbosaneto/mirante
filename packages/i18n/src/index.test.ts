import { afterEach, describe, expect, it } from "vitest";

import {
  changeLocale,
  configureI18n,
  detectInitialLocale,
  findMissingTranslationKeys,
  formatDate,
  formatFileSize,
  formatNumber,
  i18n,
  localeStorageKey,
  registerLocaleResources,
  translationResources,
} from "./index";

describe("internationalization", () => {
  afterEach(async () => {
    localStorage.clear();
    configureI18n({
      fallbackLocale: "en",
      supportedLocales: ["en", "pt-BR"],
    });
    await changeLocale("en");
  });

  it("prefers a stored locale and falls back to browser preferences", () => {
    expect(detectInitialLocale("pt-BR", ["en-US"])).toBe("pt-BR");
    expect(detectInitialLocale(null, ["es", "pt"])).toBe("pt-BR");
    expect(detectInitialLocale(null, ["es"])).toBe("en");
  });

  it("keeps bundled locale keys in sync", () => {
    for (const namespace of [
      "authentication",
      "common",
      "featureInfo",
      "layers",
      "map",
      "maps",
    ] as const) {
      expect(
        findMissingTranslationKeys(
          translationResources.en[namespace],
          translationResources["pt-BR"][namespace],
        ),
      ).toEqual([]);
      expect(
        findMissingTranslationKeys(
          translationResources["pt-BR"][namespace],
          translationResources.en[namespace],
        ),
      ).toEqual([]);
    }
  });

  it("persists explicit locale changes", async () => {
    await changeLocale("pt-BR");

    expect(localStorage.getItem(localeStorageKey)).toBe("pt-BR");
    expect(document.documentElement.lang).toBe("pt-BR");
  });

  it("registers a distribution locale without changing internal types", async () => {
    registerLocaleResources("es", {
      distribution: { greeting: "Hola" },
    });
    configureI18n({
      fallbackLocale: "en",
      supportedLocales: ["en", "pt-BR", "es"],
    });

    await changeLocale("es");

    expect(i18n.t("greeting", { ns: "distribution" })).toBe("Hola");
    expect(document.documentElement.lang).toBe("es");
  });

  it("formats dates, numbers, and file sizes for a locale", () => {
    expect(formatNumber(1234.5, undefined, "pt-BR")).toBe("1.234,5");
    expect(formatFileSize(1536, "pt-BR")).toBe("1,5 KB");
    expect(
      formatDate(
        new Date("2026-08-25T12:00:00Z"),
        { dateStyle: "short", timeZone: "UTC" },
        "en",
      ),
    ).toBe("8/25/26");
  });
});
