# Configuration

Mirante distributions define their public settings with `defineMiranteConfig` from `@mirante/core`. The official distribution is configured in `apps/mirante/src/config.ts`.

The current contract covers:

- Application name and logo URL.
- Primary theme colors.
- GeoNode base URL.
- Supported and fallback locales.
- Initial map center and zoom.
- Dataset upload, drawing, and measurement feature flags.

```ts
import { defineMiranteConfig } from "@mirante/core";

export const config = defineMiranteConfig({
  branding: {
    applicationName: "My Geoportal",
    logoUrl: "/branding/logo.svg",
  },
  theme: {
    primaryColor: "#14b8a6",
    primaryColorStrong: "#0d9488",
  },
  geonode: {
    baseUrl: "/",
  },
  i18n: {
    supportedLocales: ["en", "pt-BR"],
    fallbackLocale: "en",
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
```

Institutional distributions should own this configuration and pass it to `createMirante`. They do not need to modify package internals.
