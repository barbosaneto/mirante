import {
  type GeoNodeAttributeFilter,
  type GeoNodeAttributeFilterOperator,
  type GeoNodeAttributeType,
  type GeoNodeDataset,
  type GeoNodeDatasetClient,
  type GeoNodeDatasetFeature,
  type GeoNodeDatasetFeaturePage,
} from "@mirante/geonode";
import { formatNumber } from "@mirante/i18n";
import { useEffect, useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { FocusIcon } from "../shell/Icons";

interface AttributeTableProps {
  client: GeoNodeDatasetClient;
  dataset: GeoNodeDataset;
  filter?: GeoNodeAttributeFilter;
  onClose: () => void;
  onFilterChange: (filter: GeoNodeAttributeFilter | undefined) => void;
  onLocate: (feature: GeoNodeDatasetFeature) => void;
  selectedFeatureId?: string;
}

type AttributeTableState =
  | { status: "error" }
  | { status: "loading" }
  | { status: "ready"; result: GeoNodeDatasetFeaturePage };

const pageSize = 25;

interface AttributeField {
  name: string;
  type: GeoNodeAttributeType;
}

const comparisonOperators: readonly GeoNodeAttributeFilterOperator[] = [
  "equals",
  "not-equals",
  "greater-than",
  "greater-or-equal",
  "less-than",
  "less-or-equal",
];

function inferAttributeType(values: readonly unknown[]): GeoNodeAttributeType {
  const populatedValues = values.filter(
    (value) => value !== null && value !== undefined && value !== "",
  );

  if (
    populatedValues.length > 0 &&
    populatedValues.every((value) => typeof value === "number")
  ) {
    return "number";
  }

  if (
    populatedValues.length > 0 &&
    populatedValues.every(
      (value) =>
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}(?:T.*|Z)?$/.test(value),
    )
  ) {
    return "date";
  }

  return "text";
}

function formatAttributeValue(
  value: unknown,
  trueLabel: string,
  falseLabel: string,
  emptyLabel: string,
): string {
  if (value === null || value === undefined || value === "") return emptyLabel;
  if (typeof value === "boolean") return value ? trueLabel : falseLabel;
  if (typeof value === "number") return formatNumber(value);
  if (typeof value === "string") return value;
  if (typeof value === "object") return JSON.stringify(value) || emptyLabel;
  return emptyLabel;
}

export function AttributeTable({
  client,
  dataset,
  filter,
  onClose,
  onFilterChange,
  onLocate,
  selectedFeatureId,
}: AttributeTableProps) {
  const { t } = useTranslation("attributes");
  const titleId = useId();
  const [page, setPage] = useState(1);
  const [requestKey, setRequestKey] = useState(0);
  const [fields, setFields] = useState<AttributeField[]>(
    filter ? [{ name: filter.field, type: filter.type }] : [],
  );
  const [draftField, setDraftField] = useState(filter?.field ?? "");
  const [draftOperator, setDraftOperator] =
    useState<GeoNodeAttributeFilterOperator>(filter?.operator ?? "contains");
  const [draftValue, setDraftValue] = useState(filter?.value ?? "");
  const [state, setState] = useState<AttributeTableState>({
    status: "loading",
  });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });

    void client
      .listDatasetFeatures(dataset, {
        filter,
        page,
        pageSize,
        signal: controller.signal,
      })
      .then((result) => setState({ status: "ready", result }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "error" });
      });

    return () => controller.abort();
  }, [client, dataset, filter, page, requestKey]);

  const columns = useMemo(() => {
    if (state.status !== "ready") return [];

    return Array.from(
      new Set(
        state.result.features.flatMap((feature) =>
          Object.keys(feature.attributes),
        ),
      ),
    );
  }, [state]);

  useEffect(() => {
    if (state.status !== "ready") return;

    const inferredFields = columns.map((name) => ({
      name,
      type: inferAttributeType(
        state.result.features.map((feature) => feature.attributes[name]),
      ),
    }));

    setFields((currentFields) => {
      const byName = new Map(
        currentFields.map((field) => [field.name, field] as const),
      );
      inferredFields.forEach((field) => byName.set(field.name, field));
      return [...byName.values()];
    });
  }, [columns, state]);

  useEffect(() => {
    if (draftField || !fields[0]) return;

    setDraftField(fields[0].name);
    setDraftOperator(fields[0].type === "text" ? "contains" : "equals");
  }, [draftField, fields]);

  const selectedField = fields.find((field) => field.name === draftField);
  const availableOperators =
    selectedField?.type === "text"
      ? (["contains", "equals", "not-equals"] as const)
      : comparisonOperators;

  const result = state.status === "ready" ? state.result : null;
  const totalPages =
    result?.total === undefined
      ? null
      : Math.max(1, Math.ceil(result.total / result.pageSize));
  const rangeStart = result?.features.length
    ? (result.page - 1) * result.pageSize + 1
    : 0;
  const rangeEnd = result
    ? (result.page - 1) * result.pageSize + result.features.length
    : 0;

  return (
    <section
      className="attribute-table"
      role="dialog"
      aria-labelledby={titleId}
    >
      <header className="attribute-table__header">
        <div>
          <p className="attribute-table__eyebrow">{t("eyebrow")}</p>
          <h2 id={titleId}>{dataset.title}</h2>
        </div>
        {result ? (
          <p className="attribute-table__summary">
            {result.total === undefined
              ? t("summaryWithoutTotal", {
                  start: rangeStart,
                  end: rangeEnd,
                })
              : t("summary", {
                  start: rangeStart,
                  end: rangeEnd,
                  total: formatNumber(result.total),
                })}
          </p>
        ) : null}
        <button
          type="button"
          className="attribute-table__close"
          aria-label={t("close")}
          onClick={onClose}
        >
          ×
        </button>
      </header>

      <div className="attribute-table__content">
        <form
          className="attribute-table__filter"
          onSubmit={(event) => {
            event.preventDefault();
            if (!selectedField || !draftValue.trim()) return;

            const nextFilter: GeoNodeAttributeFilter = {
              field: selectedField.name,
              operator: draftOperator,
              type: selectedField.type,
              value: draftValue.trim(),
            };
            setPage(1);
            onFilterChange(nextFilter);
          }}
        >
          <label>
            <span>{t("filter.field")}</span>
            <select
              value={draftField}
              disabled={fields.length === 0}
              onChange={(event) => {
                const field = fields.find(
                  (candidate) => candidate.name === event.currentTarget.value,
                );
                setDraftField(event.currentTarget.value);
                setDraftOperator(
                  field?.type === "text" ? "contains" : "equals",
                );
                setDraftValue("");
              }}
            >
              {fields.length === 0 ? (
                <option value="">{t("filter.noFields")}</option>
              ) : null}
              {fields.map((field) => (
                <option value={field.name} key={field.name}>
                  {field.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t("filter.operator")}</span>
            <select
              value={draftOperator}
              disabled={!selectedField}
              onChange={(event) =>
                setDraftOperator(
                  event.currentTarget.value as GeoNodeAttributeFilterOperator,
                )
              }
            >
              {availableOperators.map((operator) => (
                <option value={operator} key={operator}>
                  {t(`filter.operators.${operator}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="attribute-table__filter-value">
            <span>{t("filter.value")}</span>
            <input
              type={
                selectedField?.type === "number"
                  ? "number"
                  : selectedField?.type === "date"
                    ? "date"
                    : "text"
              }
              value={draftValue}
              disabled={!selectedField}
              placeholder={t("filter.placeholder")}
              step={selectedField?.type === "number" ? "any" : undefined}
              onChange={(event) => setDraftValue(event.currentTarget.value)}
            />
          </label>
          <button
            type="submit"
            className="button button--primary"
            disabled={!selectedField || !draftValue.trim()}
          >
            {t("filter.apply")}
          </button>
          {filter ? (
            <button
              type="button"
              className="button button--secondary"
              onClick={() => {
                setPage(1);
                setDraftValue("");
                onFilterChange(undefined);
              }}
            >
              {t("filter.clear")}
            </button>
          ) : null}
        </form>
        {state.status === "loading" ? (
          <p className="attribute-table__state" role="status">
            {t("loading")}
          </p>
        ) : null}
        {state.status === "error" ? (
          <div className="attribute-table__state attribute-table__state--error">
            <p role="alert">{t("error")}</p>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => setRequestKey((key) => key + 1)}
            >
              {t("retry")}
            </button>
          </div>
        ) : null}
        {result && result.features.length === 0 ? (
          <p className="attribute-table__state">
            {filter ? t("filter.empty") : t("empty")}
          </p>
        ) : null}
        {result && result.features.length > 0 ? (
          <div className="attribute-table__scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">{t("featureId")}</th>
                  {columns.map((column) => (
                    <th scope="col" key={column}>
                      {column}
                    </th>
                  ))}
                  <th scope="col" className="attribute-table__action-heading">
                    {t("actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.features.map((feature) => (
                  <tr
                    key={feature.id}
                    className={
                      selectedFeatureId === feature.id
                        ? "attribute-table__row--selected"
                        : undefined
                    }
                  >
                    <th scope="row">{feature.id}</th>
                    {columns.map((column) => (
                      <td key={column}>
                        {formatAttributeValue(
                          feature.attributes[column],
                          t("values.true"),
                          t("values.false"),
                          t("values.empty"),
                        )}
                      </td>
                    ))}
                    <td className="attribute-table__action">
                      <button
                        type="button"
                        disabled={!feature.extent}
                        aria-label={t("locate", { id: feature.id })}
                        title={
                          feature.extent
                            ? t("locate", { id: feature.id })
                            : t("geometryUnavailable")
                        }
                        onClick={() => {
                          onLocate(feature);
                        }}
                      >
                        <FocusIcon />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {result && result.features.length > 0 ? (
        <footer className="attribute-table__pagination">
          <button
            type="button"
            className="button button--secondary"
            disabled={page <= 1 || state.status === "loading"}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            {t("previous")}
          </button>
          <span>
            {totalPages === null
              ? t("pageWithoutTotal", { page: result.page })
              : t("page", { page: result.page, totalPages })}
          </span>
          <button
            type="button"
            className="button button--secondary"
            disabled={!result.hasNext || state.status === "loading"}
            onClick={() => setPage((current) => current + 1)}
          >
            {t("next")}
          </button>
        </footer>
      ) : null}
    </section>
  );
}
