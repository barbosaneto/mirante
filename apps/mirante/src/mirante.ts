import { createMirante } from "@mirante/core";

import { miranteConfig } from "./config";
import { zoomToBrazilExtension } from "./extensions/zoomToBrazil";

export const mirante = createMirante({
  config: miranteConfig,
  extensions: [zoomToBrazilExtension],
});
