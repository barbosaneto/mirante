import { i18n } from "@mirante/i18n";
import { defineExtension } from "@mirante/sdk";
import { describe, expect, it } from "vitest";

import { createMirante, defineMiranteConfig } from "./index";

const config = defineMiranteConfig({
  branding: { applicationName: "Test", logoUrl: "/logo.svg" },
  theme: {
    borderColor: "#334155",
    errorColor: "#fca5a5",
    focusColor: "#5eead4",
    panelColor: "#081120",
    panelStrongColor: "#0b1527",
    primaryColor: "#14b8a6",
    primaryColorStrong: "#0d9488",
    primaryContrastColor: "#042f2e",
    selectionColor: "#14b8a6",
    selectionContrastColor: "#f8fafc",
    selectionFillColor: "rgb(20 184 166 / 18%)",
    successColor: "#5eead4",
    surfaceColor: "#090d16",
    textColor: "#e5e7eb",
    textMutedColor: "#94a3b8",
  },
  geonode: {
    baseUrl: "/",
    webUrl: "http://localhost:8000",
    datasetManagementPath: "/catalogue/#/",
  },
  i18n: {
    locales: [
      { id: "en", label: "English" },
      { id: "pt-BR", label: "Português (Brasil)" },
    ],
    fallbackLocale: "en",
  },
  map: {
    baseMaps: [
      {
        id: "test",
        labels: { en: "Test" },
        tileUrl: "https://example.test/{z}/{x}/{y}.png",
        attributions: [],
      },
    ],
    defaultBaseMapId: "test",
    initialCenter: [-52, -15],
    initialZoom: 4,
  },
  features: { datasetUpload: true },
});

describe("createMirante", () => {
  it("registers native and distribution toolbar items with translations", () => {
    const extension = defineExtension({
      id: "example-extension",
      mapToolbar: [
        {
          id: "example-action",
          labelKey: "action.label",
          icon: "globe",
          onClick() {},
        },
      ],
      translations: {
        en: { action: { label: "Example action" } },
        "pt-BR": { action: { label: "Ação de exemplo" } },
      },
    });

    const definition = createMirante({ config, extensions: [extension] });

    expect(definition.mapToolbar).toHaveLength(2);
    expect(
      i18n.t("action.label", { ns: "extension-example-extension", lng: "en" }),
    ).toBe("Example action");
  });

  it("registers extension panels and arbitrary locale translations", () => {
    function Panel() {
      return null;
    }
    const extension = defineExtension({
      id: "panel-extension",
      panels: [{ id: "details", titleKey: "panel.title", component: Panel }],
      translations: { es: { panel: { title: "Detalles" } } },
    });
    const extendedConfig = defineMiranteConfig({
      ...config,
      i18n: {
        locales: [...config.i18n.locales, { id: "es", label: "Español" }],
        fallbackLocale: "en",
      },
    });

    const definition = createMirante({
      config: extendedConfig,
      extensions: [extension],
    });

    expect(definition.panels).toMatchObject([
      {
        id: "details",
        extensionId: "panel-extension",
        translationNamespace: "extension-panel-extension",
      },
    ]);
    expect(
      i18n.t("panel.title", { ns: "extension-panel-extension", lng: "es" }),
    ).toBe("Detalles");
  });

  it("rejects duplicate extension ids", () => {
    const extension = defineExtension({ id: "duplicate" });

    expect(() =>
      createMirante({ config, extensions: [extension, extension] }),
    ).toThrow('Extension id "duplicate" is already registered.');
  });

  it("rejects duplicate panel ids across extensions", () => {
    function Panel() {
      return null;
    }
    const first = defineExtension({
      id: "first",
      panels: [{ id: "details", titleKey: "title", component: Panel }],
    });
    const second = defineExtension({
      id: "second",
      panels: [{ id: "details", titleKey: "title", component: Panel }],
    });

    expect(() =>
      createMirante({ config, extensions: [first, second] }),
    ).toThrow('Panel id "details" is already registered.');
  });

  it("rejects invalid distribution registries", () => {
    expect(() =>
      createMirante({
        config: {
          ...config,
          map: {
            ...config.map,
            baseMaps: [...config.map.baseMaps, ...config.map.baseMaps],
          },
        },
      }),
    ).toThrow("Base map identifiers must be non-empty and unique.");
  });
});
