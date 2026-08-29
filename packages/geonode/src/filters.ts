export type GeoNodeAttributeType = "date" | "number" | "text";

export type GeoNodeAttributeFilterOperator =
  | "contains"
  | "equals"
  | "greater-or-equal"
  | "greater-than"
  | "less-or-equal"
  | "less-than"
  | "not-equals";

export interface GeoNodeAttributeFilterCondition {
  field: string;
  operator: GeoNodeAttributeFilterOperator;
  type: GeoNodeAttributeType;
  value: string;
}

export type GeoNodeAttributeFilterCombinator = "and" | "or";

export interface GeoNodeAttributeFilterGroup {
  combinator: GeoNodeAttributeFilterCombinator;
  conditions: readonly GeoNodeAttributeFilterCondition[];
}

export type GeoNodeAttributeFilter =
  | GeoNodeAttributeFilterCondition
  | GeoNodeAttributeFilterGroup;

export const maximumGeoNodeFilterConditions = 50;
export const maximumGeoNodeFilterFieldLength = 256;
export const maximumGeoNodeFilterValueLength = 2_048;

export function isGeoNodeAttributeFilterGroup(
  filter: GeoNodeAttributeFilter,
): filter is GeoNodeAttributeFilterGroup {
  return "conditions" in filter;
}

const comparisonOperators: Record<
  Exclude<GeoNodeAttributeFilterOperator, "contains">,
  string
> = {
  equals: "=",
  "not-equals": "<>",
  "greater-than": ">",
  "greater-or-equal": ">=",
  "less-than": "<",
  "less-or-equal": "<=",
};

function quoteIdentifier(identifier: string): string {
  const normalizedIdentifier = identifier.trim();

  if (!normalizedIdentifier) {
    throw new Error("An attribute field is required.");
  }
  if (normalizedIdentifier.length > maximumGeoNodeFilterFieldLength) {
    throw new Error("The attribute field is too long.");
  }

  return `"${normalizedIdentifier.replaceAll('"', '""')}"`;
}

function quoteText(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function comparisonOperator(operator: GeoNodeAttributeFilterOperator): string {
  if (operator === "contains") {
    throw new Error("Contains is only supported by text attributes.");
  }

  return comparisonOperators[operator];
}

function serializeCondition(filter: GeoNodeAttributeFilterCondition): string {
  const field = quoteIdentifier(filter.field);
  const value = filter.value.trim();

  if (!value) {
    throw new Error("A filter value is required.");
  }
  if (value.length > maximumGeoNodeFilterValueLength) {
    throw new Error("The filter value is too long.");
  }

  if (filter.type === "text") {
    if (filter.operator === "contains") {
      return `${field} ILIKE ${quoteText(`%${value}%`)}`;
    }

    return `${field} ${comparisonOperator(filter.operator)} ${quoteText(value)}`;
  }

  if (filter.operator === "contains") {
    throw new Error("Contains is only supported by text attributes.");
  }

  if (filter.type === "number") {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      throw new Error("The numeric filter value is invalid.");
    }

    return `${field} ${comparisonOperator(filter.operator)} ${number}`;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("The date filter value is invalid.");
  }

  return `${field} ${comparisonOperator(filter.operator)} DATE ${quoteText(value)}`;
}

export function serializeGeoNodeAttributeFilter(
  filter: GeoNodeAttributeFilter,
): string {
  if (!isGeoNodeAttributeFilterGroup(filter)) return serializeCondition(filter);

  if (filter.conditions.length === 0) {
    throw new Error("At least one filter condition is required.");
  }
  if (filter.conditions.length > maximumGeoNodeFilterConditions) {
    throw new Error("The filter contains too many conditions.");
  }

  const separator = filter.combinator === "and" ? " AND " : " OR ";
  return filter.conditions
    .map((condition) => `(${serializeCondition(condition)})`)
    .join(separator);
}
