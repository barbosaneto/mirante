import { createMirante } from "@mirante/core";

import { googleOidcEnabled, miranteConfig } from "./config";
import { createDistributionExtensions } from "./extensions";

export const mirante = createMirante({
  config: miranteConfig,
  extensions: createDistributionExtensions({ googleOidcEnabled }),
});
