import { describe, expect, it } from "vitest";

import { createDatasetStyleFile } from "./sld";

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("FileReader did not return text."));
      }
    });
    reader.addEventListener("error", () =>
      reject(reader.error ?? new Error("FileReader failed.")),
    );
    reader.readAsText(file);
  });
}

describe("GeoNode SLD generation", () => {
  it("creates a square point symbolizer with escaped dataset values", async () => {
    const file = createDatasetStyleFile(
      {
        id: 42,
        title: "Points & places",
        layerName: "geonode:points",
      },
      {
        geometry: "point",
        shape: "square",
        fillColor: "#22c55e",
        strokeColor: "#14532d",
      },
    );
    const xml = await readFile(file);

    expect(file.name).toBe("mirante-42.sld");
    expect(xml).toContain("<sld:PointSymbolizer>");
    expect(xml).toContain("<sld:WellKnownName>square</sld:WellKnownName>");
    expect(xml).toContain("Points &amp; places");
    expect(xml).toContain("#22c55e");
    expect(xml).toContain("#14532d");
  });

  it("creates a line symbolizer with its color and width", async () => {
    const file = createDatasetStyleFile(
      {
        id: 43,
        title: "Federal roads",
        layerName: "geonode:federal_roads",
      },
      {
        geometry: "line",
        strokeColor: "#dc2626",
        strokeWidth: 3.5,
      },
    );
    const xml = await readFile(file);

    expect(xml).toContain("<sld:LineSymbolizer>");
    expect(xml).toContain(
      '<sld:CssParameter name="stroke">#dc2626</sld:CssParameter>',
    );
    expect(xml).toContain(
      '<sld:CssParameter name="stroke-width">3.5</sld:CssParameter>',
    );
    expect(xml).toContain(
      '<sld:CssParameter name="stroke-linecap">round</sld:CssParameter>',
    );
  });

  it("rejects an invalid line width", () => {
    expect(() =>
      createDatasetStyleFile(
        { id: 43, title: "Roads", layerName: "geonode:roads" },
        {
          geometry: "line",
          strokeColor: "#dc2626",
          strokeWidth: 25,
        },
      ),
    ).toThrow("Dataset line width must be between 0.5 and 20 pixels.");
  });

  it("rejects invalid color values", () => {
    expect(() =>
      createDatasetStyleFile(
        { id: 42, title: "Areas", layerName: "geonode:areas" },
        {
          geometry: "polygon",
          fillColor: "teal",
          strokeColor: "#14532d",
        },
      ),
    ).toThrow("Dataset style colors must use hexadecimal values.");
  });
});
