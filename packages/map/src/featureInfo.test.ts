import { describe, expect, it } from "vitest";

import { parseWmsFeatureInfo } from "./featureInfo";

describe("WMS feature information", () => {
  it("maps GeoServer GeoJSON properties and selection geometry", () => {
    expect(
      parseWmsFeatureInfo(7, "Land parcels", {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            id: "parcels.14",
            geometry: { type: "Point", coordinates: [-52, -15] },
            properties: {
              name: "Parcel 14",
              area: 97.68,
              approved: true,
              owner: null,
            },
          },
        ],
      }),
    ).toEqual([
      {
        datasetId: 7,
        datasetTitle: "Land parcels",
        featureId: "parcels.14",
        geometry: { type: "Point", coordinates: [-52, -15] },
        attributes: {
          name: "Parcel 14",
          area: 97.68,
          approved: true,
          owner: null,
        },
      },
    ]);
  });

  it("rejects responses outside the WMS GeoJSON contract", () => {
    expect(() =>
      parseWmsFeatureInfo(7, "Land parcels", "Service error"),
    ).toThrow("The WMS server returned an invalid feature response.");
  });

  it("caps the number of feature-info results accepted from a server", () => {
    const result = parseWmsFeatureInfo(7, "Land parcels", {
      features: Array.from({ length: 20 }, (_, index) => ({
        id: `parcels.${index}`,
        properties: { index },
      })),
    });

    expect(result).toHaveLength(10);
    expect(result.at(-1)?.featureId).toBe("parcels.9");
  });
});
