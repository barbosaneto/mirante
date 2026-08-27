import { describe, expect, it } from "vitest";

import { validateDatasetFile } from "./fileValidation";

describe("dataset file validation", () => {
  it("accepts a GeoJSON FeatureCollection", async () => {
    const file = new File(
      [JSON.stringify({ type: "FeatureCollection", features: [] })],
      "dataset.geojson",
      { type: "application/geo+json" },
    );

    await expect(validateDatasetFile(file)).resolves.toBeNull();
  });

  it("accepts KML and ZIP files", async () => {
    const kml = new File(
      [
        '<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document /></kml>',
      ],
      "dataset.kml",
      { type: "application/vnd.google-earth.kml+xml" },
    );
    const zip = new File(
      [new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00])],
      "shapefile.zip",
      { type: "application/zip" },
    );

    await expect(validateDatasetFile(kml)).resolves.toBeNull();
    await expect(validateDatasetFile(zip)).resolves.toBeNull();
  });

  it("rejects unsupported extensions and invalid supported files", async () => {
    const unsupported = new File(["{}"], "dataset.json");
    const invalidGeoJson = new File(["{}"], "dataset.geojson");
    const invalidKml = new File(["<Document />"], "dataset.kml");
    const invalidZip = new File(["not a zip"], "dataset.zip");

    await expect(validateDatasetFile(unsupported)).resolves.toBe(
      "unsupported-format",
    );
    await expect(validateDatasetFile(invalidGeoJson)).resolves.toBe(
      "invalid-geojson",
    );
    await expect(validateDatasetFile(invalidKml)).resolves.toBe("invalid-kml");
    await expect(validateDatasetFile(invalidZip)).resolves.toBe("invalid-zip");
  });
});
