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
  branding: {
    applicationName: "Mirante",
    logoUrl: miranteLogo,
  },
  theme: {
    primaryColor: "#14b8a6",
    primaryColorStrong: "#0d9488",
  },
  geonode: {
    baseUrl: geonodeBaseUrl,
    webUrl: geonodeWebUrl,
    datasetManagementPath: "/catalogue/#/",
  },
  i18n: {
    supportedLocales,
    fallbackLocale,
  },
  map: {
    initialCenter: [-52, -15],
    initialZoom: 4,
  },
  features: {
    datasetUpload: true,
    drawings: true,
    measurements: true,
  },
});
