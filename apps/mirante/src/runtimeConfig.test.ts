import { describe, expect, it } from "vitest";

import { readMiranteRuntimeConfig } from "./runtimeConfig";

describe("readMiranteRuntimeConfig", () => {
  it("accepts supported runtime values", () => {
    expect(
      readMiranteRuntimeConfig({
        datasetUploadMaximumFileSizeBytes: 50_000_000,
        datasetUploadVisibilityControl: false,
        geonodeBaseUrl: "/",
        geonodeWebUrl: "https://geonode.example.test",
        googleOidcEnabled: true,
        requireAuthentication: true,
      }),
    ).toEqual({
      datasetUploadMaximumFileSizeBytes: 50_000_000,
      datasetUploadVisibilityControl: false,
      geonodeBaseUrl: "/",
      geonodeWebUrl: "https://geonode.example.test",
      googleOidcEnabled: true,
      requireAuthentication: true,
    });
  });

  it("ignores malformed runtime values", () => {
    expect(
      readMiranteRuntimeConfig({
        datasetUploadMaximumFileSizeBytes: -1,
        datasetUploadVisibilityControl: "false",
        geonodeBaseUrl: "",
        geonodeWebUrl: null,
        googleOidcEnabled: "true",
        requireAuthentication: 1,
      }),
    ).toEqual({
      datasetUploadMaximumFileSizeBytes: undefined,
      datasetUploadVisibilityControl: undefined,
      geonodeBaseUrl: undefined,
      geonodeWebUrl: undefined,
      googleOidcEnabled: undefined,
      requireAuthentication: undefined,
    });
  });

  it("rejects non-object configuration", () => {
    expect(readMiranteRuntimeConfig(null)).toEqual({});
    expect(readMiranteRuntimeConfig([])).toEqual({});
  });
});
