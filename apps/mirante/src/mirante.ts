import { createMirante } from "@mirante/core";

import { miranteConfig } from "./config";

export const mirante = createMirante({
  config: miranteConfig,
});
