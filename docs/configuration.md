# Configuration

Mirante distributions define public settings with `defineMiranteConfig` from
`@mirante/core`. The official distribution owns its configuration in
`apps/mirante/src/config.ts`; packages do not import that file.

The contract covers:

- Optional or required GeoNode authentication before application startup.
- Application name and logo URL.
- Semantic theme colors exposed as CSS custom properties.
- GeoNode API base URL, public web URL, and dataset management path.
- Locale identifiers, native labels, optional resources, and fallback.
- XYZ base-map definitions, localized labels, and attribution.
- Initial center and zoom.
- Feature availability.

```ts
import { defineMiranteConfig } from "@mirante/core";

export const config = defineMiranteConfig({
  authentication: {
    required: false,
  },
  branding: {
    applicationName: "My Geoportal",
    logoUrl: "/branding/logo.svg",
  },
  theme: {
    primaryColor: "#14b8a6",
    primaryColorStrong: "#0d9488",
    primaryContrastColor: "#042f2e",
    selectionColor: "#14b8a6",
    selectionContrastColor: "#f8fafc",
    selectionFillColor: "rgb(20 184 166 / 18%)",
    textColor: "#e5e7eb",
    textMutedColor: "#94a3b8",
    surfaceColor: "#090d16",
    panelColor: "rgb(8 17 32 / 94%)",
    panelStrongColor: "#0b1527",
    borderColor: "rgb(51 65 85 / 62%)",
    focusColor: "#5eead4",
    successColor: "#5eead4",
    errorColor: "#fca5a5",
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
        id: "open-street-map",
        labels: { en: "OpenStreetMap", "pt-BR": "OpenStreetMap" },
        tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        attributions: ["OpenStreetMap contributors"],
      },
    ],
    defaultBaseMapId: "open-street-map",
    initialCenter: [-52, -15],
    initialZoom: 4,
  },
  features: {
    datasetUpload: true,
  },
});
```

Theme values are installed on the application root as semantic
`--mirante-color-*` properties. Derived translucent states use `color-mix`, so
hover, selection, loading, success, and error surfaces follow the configured
palette rather than retaining distribution-specific literals.

Institutional distributions should own this configuration, branding assets,
locale resources, and extension list. Updating Mirante packages then does not
require maintaining a fork of internal files.
