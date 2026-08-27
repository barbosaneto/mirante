import { describe, expect, it } from "vitest";

import { serializeGeoNodeAttributeFilter } from "./filters";

describe("GeoNode attribute filters", () => {
  it("serializes and escapes a case-insensitive text search", () => {
    expect(
      serializeGeoNodeAttributeFilter({
        field: 'owner"name',
        operator: "contains",
        type: "text",
        value: "D'Ávila",
      }),
    ).toBe("\"owner\"\"name\" ILIKE '%D''Ávila%'");
  });

  it("serializes numeric and date comparisons without quoting numbers", () => {
    expect(
      serializeGeoNodeAttributeFilter({
        field: "population",
        operator: "greater-or-equal",
        type: "number",
        value: "1200",
      }),
    ).toBe('"population" >= 1200');
    expect(
      serializeGeoNodeAttributeFilter({
        field: "survey_date",
        operator: "less-than",
        type: "date",
        value: "2026-08-26",
      }),
    ).toBe("\"survey_date\" < DATE '2026-08-26'");
  });

  it("rejects incompatible or invalid filter values", () => {
    expect(() =>
      serializeGeoNodeAttributeFilter({
        field: "population",
        operator: "contains",
        type: "number",
        value: "12",
      }),
    ).toThrow("Contains is only supported");
    expect(() =>
      serializeGeoNodeAttributeFilter({
        field: "population",
        operator: "equals",
        type: "number",
        value: "twelve",
      }),
    ).toThrow("numeric filter value is invalid");
  });
});
