import { defineExtension } from "@mirante/sdk";

export const googleOidcExtension = defineExtension({
  id: "google-oidc",
  authenticationProviders: [
    {
      id: "google",
      labelKey: "provider.label",
      loginPath: "/account/geonode_openid_connect/login/?process=login",
    },
  ],
  translations: {
    en: {
      provider: {
        label: "Continue with Google",
      },
    },
    "pt-BR": {
      provider: {
        label: "Continuar com Google",
      },
    },
  },
});
