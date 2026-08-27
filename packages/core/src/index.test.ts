import { i18n } from "@mirante/i18n";
import { defineExtension } from "@mirante/sdk";
import { describe, expect, it } from "vitest";

import { createMirante, defineMiranteConfig } from "./index";

const config = defineMiranteConfig({
  branding: { applicationName: "Test", logoUrl: "/logo.svg" },
  theme: { primaryColor: "#14b8a6", primaryColorStrong: "#0d9488" },
  geonode: { baseUrl: "/" },
  i18n: { supportedLocales: ["en", "pt-BR"], fallbackLocale: "en" },
  map: { initialCenter: [-52, -15], initialZoom: 4 },
  features: { datasetUpload: true, drawings: true, measurements: true },
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

  it("rejects duplicate extension ids", () => {
    const extension = defineExtension({ id: "duplicate" });

    expect(() =>
      createMirante({ config, extensions: [extension, extension] }),
    ).toThrow('Extension id "duplicate" is already registered.');
  });
});
