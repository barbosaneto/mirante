import { describe, expect, it } from "vitest";

import { mirante } from "./mirante";

describe("official Mirante distribution", () => {
  it("registers Google OIDC by default", () => {
    expect(mirante.authenticationProviders).toEqual([
      expect.objectContaining({
        id: "google",
        extensionId: "google-oidc",
      }),
    ]);
  });
});
