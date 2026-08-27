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

  it("serializes multiple conditions with explicit AND and OR grouping", () => {
    const conditions = [
      {
        field: "population",
        operator: "greater-or-equal" as const,
        type: "number" as const,
        value: "1000",
      },
      {
        field: "name",
        operator: "contains" as const,
        type: "text" as const,
        value: "São",
      },
    ];

    expect(
      serializeGeoNodeAttributeFilter({ combinator: "and", conditions }),
    ).toBe(`("population" >= 1000) AND ("name" ILIKE '%São%')`);
    expect(
      serializeGeoNodeAttributeFilter({ combinator: "or", conditions }),
    ).toBe(`("population" >= 1000) OR ("name" ILIKE '%São%')`);
  });

  it("rejects an empty condition group", () => {
    expect(() =>
      serializeGeoNodeAttributeFilter({ combinator: "and", conditions: [] }),
    ).toThrow("At least one filter condition");
  });
});
