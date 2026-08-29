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

The registry validates extension, panel, and authentication-provider identifiers, rejects duplicates,
isolates translation namespaces, and renders native and external toolbar actions
through the same path.

Extensions can also register login buttons backed by social or institutional
providers configured in GeoNode. See [Authentication](authentication.md) for
the provider contract and security constraints.

## Access requirements

Toolbar actions and panels can declare access requirements without importing
application internals:

```ts
export default defineExtension({
  id: "resource-tools",
  mapToolbar: [
    {
      id: "publish-analysis",
      labelKey: "publish.label",
      icon: "globe",
      access: {
        authenticated: true,
        allOf: ["uploadDatasets"],
      },
      onClick() {},
    },
    {
      id: "edit-map-notes",
      labelKey: "notes.label",
      icon: "home",
      access: {
        anyOf: ["editCurrentMap", "manageCurrentMap"],
      },
      onClick({ ui }) {
        ui.openPanel("map-notes");
      },
    },
  ],
  panels: [
    {
      id: "map-notes",
      titleKey: "notes.title",
      access: { allOf: ["editCurrentMap"] },
      component: MapNotesPanel,
    },
  ],
});
```

`allOf` requires every listed capability. `anyOf` requires at least one. When
both are present, both rules must pass. Supported capabilities are:

| Capability         | Meaning                                             |
| ------------------ | --------------------------------------------------- |
| `createMaps`       | The GeoNode user can create resource-backed maps    |
| `uploadDatasets`   | The GeoNode user can publish datasets               |
| `manageGeoNode`    | The session belongs to GeoNode staff or a superuser |
| `editCurrentMap`   | The user owns or can edit the opened saved map      |
| `manageCurrentMap` | The user owns or can manage the opened saved map    |

The shell disables toolbar actions whose requirements are not met and refuses
to open inaccessible panels. It reevaluates resource capabilities when the
current saved map changes.

`requiresAuthentication: true` remains supported for existing extensions and
is normalized to `access.authenticated`. New extensions should use `access`.

Access requirements describe presentation policy. They do not replace server
authorization: an extension must call GeoNode endpoints that independently
enforce the corresponding operation.

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
