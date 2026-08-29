import { describe, expect, it } from "vitest";

import {
  defaultMaximumDatasetFileSize,
  validateDatasetFile,
} from "./fileValidation";

function createStoredZip(
  filename: string,
  { compressedSize = 1, uncompressedSize = 1 } = {},
): Uint8Array {
  const name = new TextEncoder().encode(filename);
  const localSize = 30 + name.length + 1;
  const centralSize = 46 + name.length;
  const bytes = new Uint8Array(localSize + centralSize + 22);
  const view = new DataView(bytes.buffer);

  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0x0800, true);
  view.setUint32(18, compressedSize, true);
  view.setUint32(22, uncompressedSize, true);
  view.setUint16(26, name.length, true);
  bytes.set(name, 30);

  const centralOffset = localSize;
  view.setUint32(centralOffset, 0x02014b50, true);
  view.setUint16(centralOffset + 4, 20, true);
  view.setUint16(centralOffset + 6, 20, true);
  view.setUint16(centralOffset + 8, 0x0800, true);
  view.setUint32(centralOffset + 20, compressedSize, true);
  view.setUint32(centralOffset + 24, uncompressedSize, true);
  view.setUint16(centralOffset + 28, name.length, true);
  bytes.set(name, centralOffset + 46);

  const endOffset = localSize + centralSize;
  view.setUint32(endOffset, 0x06054b50, true);
  view.setUint16(endOffset + 8, 1, true);
  view.setUint16(endOffset + 10, 1, true);
  view.setUint32(endOffset + 12, centralSize, true);
  view.setUint32(endOffset + 16, centralOffset, true);

  return bytes;
}

describe("dataset file validation", () => {
  it("defaults to 100 MB and accepts a custom maximum size", async () => {
    expect(defaultMaximumDatasetFileSize).toBe(100 * 1024 * 1024);
    const file = new File(
      [JSON.stringify({ type: "FeatureCollection", features: [] })],
      "dataset.geojson",
    );
    Object.defineProperty(file, "size", { value: 101 });

    await expect(validateDatasetFile(file, 100)).resolves.toBe(
      "file-too-large",
    );
  });

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
    const zip = new File([createStoredZip("dataset.shp")], "shapefile.zip", {
      type: "application/zip",
    });

    await expect(validateDatasetFile(kml)).resolves.toBeNull();
    await expect(validateDatasetFile(zip)).resolves.toBeNull();
  });

  it("rejects ZIP archives with non-ASCII internal filenames", async () => {
    const zip = new File(
      [createStoredZip("Municípios AC e AM.cpg")],
      "municipios.zip",
      { type: "application/zip" },
    );

    await expect(validateDatasetFile(zip)).resolves.toBe(
      "non-ascii-zip-filenames",
    );
  });

  it("rejects unsafe ZIP paths and suspicious compression ratios", async () => {
    const traversal = new File(
      [createStoredZip("../dataset.shp")],
      "traversal.zip",
    );
    const bomb = new File(
      [
        createStoredZip("dataset.dbf", {
          compressedSize: 1,
          uncompressedSize: 10_000,
        }),
      ],
      "bomb.zip",
    );

    await expect(validateDatasetFile(traversal)).resolves.toBe("unsafe-zip");
    await expect(validateDatasetFile(bomb)).resolves.toBe("unsafe-zip");
  });

  it("rejects KML documents that declare DTDs or entities", async () => {
    const kml = new File(
      [
        '<?xml version="1.0"?><!DOCTYPE kml [<!ENTITY value "unsafe">]><kml><Placemark>&value;</Placemark></kml>',
      ],
      "dataset.kml",
    );

    await expect(validateDatasetFile(kml)).resolves.toBe("invalid-kml");
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
