import { defineExtension } from "@mirante/sdk";

import { PresetsIcon, ViewPresetsPanel } from "./ViewPresetsPanel";

export const viewPresetsExtension = defineExtension({
  id: "view-presets",
  mapToolbar: [
    {
      id: "open-view-presets",
      labelKey: "toolbar.label",
      icon: PresetsIcon,
      onClick({ ui }) {
        ui.openPanel("view-presets");
      },
    },
  ],
  panels: [
    {
      id: "view-presets",
      titleKey: "panel.title",
      component: ViewPresetsPanel,
    },
  ],
  translations: {
    en: {
      toolbar: { label: "Open view presets" },
      panel: {
        title: "View presets",
        description:
          "This panel is provided by a distribution extension using only the public SDK.",
        brazil: "Show Brazil",
      },
    },
    "pt-BR": {
      toolbar: { label: "Abrir vistas predefinidas" },
      panel: {
        title: "Vistas predefinidas",
        description:
          "Este painel é fornecido por uma extensão da distribuição usando apenas a SDK pública.",
        brazil: "Mostrar Brasil",
      },
    },
  },
});
