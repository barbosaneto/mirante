# Configuration

Mirante distributions define public settings with `defineMiranteConfig` from
`@mirante/core`. The official distribution owns its configuration in
`apps/mirante/src/config.ts`; packages do not import that file.

Build-time configuration owns distribution identity and extension composition.
The production container additionally accepts a bounded set of operational
runtime values so the same image can be promoted without recompilation. See
[Production deployment](deployment.md) and the complete
[environment reference](environment.md).

The contract covers:

- Optional or required GeoNode authentication before application startup.
- Optional registration of the bundled Google OIDC login extension.
- Application name and logo URL.
- Semantic theme colors exposed as CSS custom properties.
- GeoNode API base URL, public web URL, and dataset management path.
- Locale identifiers, native labels, optional resources, and fallback.
- XYZ base-map definitions, localized labels, and attribution.
- Initial center and zoom.
- Feature availability.
- Maximum dataset upload file size.
- Optional dataset visibility selection during upload.

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
    datasetUploadMaximumFileSizeBytes: 100 * 1024 * 1024,
    datasetUploadVisibilityControl: true,
  },
});
```

`datasetUploadMaximumFileSizeBytes` is optional and defaults to 100 MB. It must
be a positive integer expressed in bytes. The configured value controls both
the upload dialog message and its client-side file-size validation. GeoNode's
server-side upload limit remains authoritative and must be configured
separately.

`datasetUploadVisibilityControl` controls whether the upload dialog offers
public, private, and group access. The official distribution reads it from
`VITE_DATASET_UPLOAD_VISIBILITY_CONTROL` during development and from
`MIRANTE_DATASET_UPLOAD_VISIBILITY_CONTROL` when the production container
starts. It is enabled by default. Set the applicable variable to `false` to hide
the whole visibility section and skip all group and permission requests. In
that mode Mirante leaves the new resource's permissions untouched, so GeoNode's
`DEFAULT_ANONYMOUS_PERMISSIONS` and
`DEFAULT_REGISTERED_MEMBERS_PERMISSIONS` settings determine access exactly as
they did before this feature. The supplied local stack keeps both defaults at
`download`, which publishes the dataset for everyone.

The official distribution reads `VITE_GOOGLE_OIDC_ENABLED` during development
and `MIRANTE_GOOGLE_OIDC_ENABLED` when the production container starts. Both
default to `true`, registering the bundled extension and showing its login
button. This does not configure Google or create credentials. Complete the
GeoNode-side setup in [Google OIDC](google-oidc.md) before exposing the flow, or
set the applicable variable to `false` to hide it.

Theme values are installed on the application root as semantic
`--mirante-color-*` properties. Derived translucent states use `color-mix`, so
hover, selection, loading, success, and error surfaces follow the configured
palette rather than retaining distribution-specific literals.

Institutional distributions should own this configuration, branding assets,
locale resources, and extension list. Updating Mirante packages then does not
require maintaining a fork of internal files.

Runtime settings intentionally do not load arbitrary scripts, extensions,
branding, themes, locales, or base-map definitions. Those remain audited
build-time distribution choices.
