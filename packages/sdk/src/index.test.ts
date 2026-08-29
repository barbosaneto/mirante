import { describe, expect, it } from "vitest";

import { isExtensionAccessAllowed, type MiranteCapabilitySet } from "./index";

const capabilities: MiranteCapabilitySet = {
  createMaps: true,
  uploadDatasets: false,
  manageGeoNode: false,
  editCurrentMap: true,
  manageCurrentMap: false,
};

describe("extension access", () => {
  it("supports authenticated, all-of, and any-of requirements", () => {
    expect(
      isExtensionAccessAllowed(
        {
          authenticated: true,
          allOf: ["createMaps", "editCurrentMap"],
          anyOf: ["manageGeoNode", "editCurrentMap"],
        },
        { authenticated: true, capabilities },
      ),
    ).toBe(true);
  });

  it("denies access when authentication or capabilities are missing", () => {
    expect(
      isExtensionAccessAllowed(
        { authenticated: true },
        { authenticated: false, capabilities },
      ),
    ).toBe(false);
    expect(
      isExtensionAccessAllowed(
        { allOf: ["uploadDatasets"] },
        { authenticated: true, capabilities },
      ),
    ).toBe(false);
    expect(
      isExtensionAccessAllowed(
        { anyOf: ["uploadDatasets", "manageGeoNode"] },
        { authenticated: true, capabilities },
      ),
    ).toBe(false);
  });
});
