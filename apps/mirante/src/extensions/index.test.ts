import { describe, expect, it } from "vitest";

import { createDistributionExtensions } from "./index";

describe("distribution extensions", () => {
  it("omits Google OIDC when the distribution explicitly disables it", () => {
    expect(
      createDistributionExtensions({ googleOidcEnabled: false }).map(
        (extension) => extension.id,
      ),
    ).toEqual(["view-presets"]);
  });

  it("registers the GeoNode Google OIDC provider when enabled", () => {
    const extensions = createDistributionExtensions({
      googleOidcEnabled: true,
    });
    const googleExtension = extensions.find(
      (extension) => extension.id === "google-oidc",
    );

    expect(googleExtension?.authenticationProviders).toEqual([
      expect.objectContaining({
        id: "google",
        loginPath: "/account/geonode_openid_connect/login/?process=login",
      }),
    ]);
    expect(googleExtension?.translations?.["pt-BR"]).toEqual({
      provider: { label: "Continuar com Google" },
    });
  });
});
