import { createMirante } from "@mirante/core";

import { miranteConfig } from "./config";
import { viewPresetsExtension } from "./extensions/view-presets";

export const mirante = createMirante({
  config: miranteConfig,
  extensions: [viewPresetsExtension],
});
