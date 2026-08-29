import { defineMiranteConfig } from "@mirante/core";
import { fallbackLocale, supportedLocales } from "@mirante/i18n";

import miranteLogo from "./assets/mirante.png";

const geonodeBaseUrl = import.meta.env.VITE_GEONODE_BASE_URL ?? "/";
const geonodeWebUrl =
  import.meta.env.VITE_GEONODE_WEB_URL ??
  (geonodeBaseUrl === "/" || geonodeBaseUrl === ""
    ? "http://localhost:8000"
    : geonodeBaseUrl);

export const miranteConfig = defineMiranteConfig({
  authentication: {
    required:
      import.meta.env.VITE_REQUIRE_AUTHENTICATION?.toLowerCase() === "true",
  },
  branding: {
    applicationName: "Mirante",
    logoUrl: miranteLogo,
  },
  theme: {
    borderColor: "rgb(51 65 85 / 62%)",
    errorColor: "#fca5a5",
    focusColor: "#5eead4",
    panelColor: "rgb(8 17 32 / 94%)",
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
    baseUrl: geonodeBaseUrl,
    webUrl: geonodeWebUrl,
    datasetManagementPath: "/catalogue/#/",
  },
  i18n: {
    locales: supportedLocales.map((id) => ({
      id,
      label: id === "en" ? "English" : "Português (Brasil)",
    })),
    fallbackLocale,
  },
  map: {
    baseMaps: [
      {
        id: "open-street-map",
        labels: {
          en: "OpenStreetMap",
          "pt-BR": "OpenStreetMap",
        },
        tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        attributions: [
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        ],
      },
      {
        id: "dark-matter",
        labels: {
          en: "Dark Matter",
          "pt-BR": "Dark Matter",
        },
        tileUrl: "https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        attributions: [
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          '&copy; <a href="https://carto.com/attributions">CARTO</a>',
        ],
      },
    ],
    defaultBaseMapId: "open-street-map",
    initialCenter: [-52, -15],
    initialZoom: 4,
  },
  features: {
    datasetUpload: true,
    datasetUploadMaximumFileSizeBytes: 100 * 1024 * 1024,
  },
});
