import { defineExtension } from "@mirante/sdk";

export const zoomToBrazilExtension = defineExtension({
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
    en: {
      zoomToBrazil: {
        label: "Zoom to Brazil",
      },
    },
    "pt-BR": {
      zoomToBrazil: {
        label: "Aproximar para o Brasil",
      },
    },
  },
});
