import { describe, expect, it } from "vitest";

import { createAuthenticationProviderUrl } from "./providerUrl";

describe("authentication provider URL", () => {
  it("preserves provider parameters and adds the return URL", () => {
    expect(
      createAuthenticationProviderUrl({
        baseUrl: "https://maps.example.test",
        loginPath: "/account/google/login/?process=login",
        returnUrl: "https://maps.example.test/viewer?map=7",
      }),
    ).toBe(
      "https://maps.example.test/account/google/login/?process=login&next=https%3A%2F%2Fmaps.example.test%2Fviewer%3Fmap%3D7",
    );
  });

  it("rejects absolute and protocol-relative provider URLs", () => {
    for (const loginPath of [
      "https://untrusted.example.test/login",
      "//untrusted.example.test/login",
      "/\\untrusted.example.test/login",
    ]) {
      expect(() =>
        createAuthenticationProviderUrl({
          baseUrl: "https://maps.example.test",
          loginPath,
          returnUrl: "https://maps.example.test/",
        }),
      ).toThrow("same-origin path");
    }
  });
});
