# Extensions

Mirante extensions are regular TypeScript modules installed and bundled by a distribution. Remote code loading and internal package imports are not supported.

Import public contracts only from `@mirante/sdk`. Paths such as `@mirante/sdk/src/...` are internal and unsupported.

```ts
import { defineExtension } from "@mirante/sdk";

export default defineExtension({
  id: "zoom-to-brazil",
  mapToolbar: [
    {
      id: "zoom-to-brazil",
      labelKey: "zoomToBrazil.label",
      icon: "globe",
      onClick({ map }) {
        map.setView({ center: [-52, -14], zoom: 4.5 });
      },
    },
  ],
  translations: {
    en: { zoomToBrazil: { label: "Zoom to Brazil" } },
    "pt-BR": { zoomToBrazil: { label: "Aproximar para o Brasil" } },
  },
});
```

Register the module in the distribution entry point:

```ts
import { createMirante } from "@mirante/core";
import extension from "./zoom-to-brazil";

export const mirante = createMirante({
  config,
  extensions: [extension],
});
```

The registry validates extension identifiers, rejects duplicates, isolates translation namespaces, and renders native and external toolbar actions through the same path.

Set `requiresAuthentication: true` on a toolbar item when its command must only run for an authenticated GeoNode session. The shell keeps that action disabled until session restoration or sign-in succeeds.
