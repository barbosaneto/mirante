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

The registry validates extension and panel identifiers, rejects duplicates,
isolates translation namespaces, and renders native and external toolbar actions
through the same path.

Set `requiresAuthentication: true` on a toolbar item when its command must only run for an authenticated GeoNode session. The shell keeps that action disabled until session restoration or sign-in succeeds.

## Panels and custom icons

Toolbar items can use a built-in icon name or a React icon component. An action
opens a registered panel through the UI facade:

```tsx
import { defineExtension, type ExtensionPanelProps } from "@mirante/sdk";
import { useTranslation } from "react-i18next";

function SearchIcon() {
  return <svg aria-hidden="true">{/* icon paths */}</svg>;
}

function SearchPanel({ close, map }: ExtensionPanelProps) {
  const { t } = useTranslation("extension-institutional-search");
  return (
    <button
      onClick={() => {
        map.setView({ center: [-47.9, -15.8], zoom: 9 });
        close();
      }}
    >
      {t("panel.apply")}
    </button>
  );
}

export default defineExtension({
  id: "institutional-search",
  mapToolbar: [
    {
      id: "open-search",
      labelKey: "toolbar.label",
      icon: SearchIcon,
      onClick({ ui }) {
        ui.openPanel("institutional-search");
      },
    },
  ],
  panels: [
    {
      id: "institutional-search",
      titleKey: "panel.title",
      component: SearchPanel,
    },
  ],
  translations: {
    en: {
      toolbar: { label: "Institutional search" },
      panel: { title: "Institutional search", apply: "Apply result" },
    },
  },
});
```

The official distribution includes
`apps/mirante/src/extensions/view-presets.tsx` as an executable example. It
imports only the SDK and its own UI dependencies; no core or application
internals are required.

Extensions are installed at build time. Remote modules, arbitrary runtime code,
marketplaces, and internal package imports remain unsupported.
