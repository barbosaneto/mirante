import type { MiranteExtension } from "@mirante/sdk";

import { googleOidcExtension } from "./google-oidc";
import { viewPresetsExtension } from "./view-presets";

export function createDistributionExtensions({
  googleOidcEnabled,
}: {
  googleOidcEnabled: boolean;
}): readonly MiranteExtension[] {
  return [
    viewPresetsExtension,
    ...(googleOidcEnabled ? [googleOidcExtension] : []),
  ];
}
