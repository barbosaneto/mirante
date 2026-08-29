import {
  isGeoNodeAttributeFilterGroup,
  maximumGeoNodeFilterConditions,
  maximumGeoNodeFilterValueLength,
  type GeoNodeAttributeFilter,
  type GeoNodeAttributeFilterCombinator,
  type GeoNodeAttributeFilterCondition,
  type GeoNodeAttributeFilterOperator,
  type GeoNodeAttributeType,
  type GeoNodeDataset,
  type GeoNodeDatasetClient,
  type GeoNodeDatasetExportFormat,
  type GeoNodeDatasetFeature,
  type GeoNodeDatasetFeaturePage,
} from "@mirante/geonode";
import { formatNumber } from "@mirante/i18n";
import {
  type UIEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

import { CloseIcon, FocusIcon } from "../shell/Icons";

interface AttributeTableProps {
  client: GeoNodeDatasetClient;
  dataset: GeoNodeDataset;
  filter?: GeoNodeAttributeFilter;
  onClose: () => void;
  onFilterChange: (filter: GeoNodeAttributeFilter | undefined) => void;
  onLocate: (feature: GeoNodeDatasetFeature) => void;
  selectedFeatureId?: string;
}

function filterConditions(
  filter: GeoNodeAttributeFilter | undefined,
): readonly GeoNodeAttributeFilterCondition[] {
  if (!filter) return [];
  return isGeoNodeAttributeFilterGroup(filter) ? filter.conditions : [filter];
}

function filterCombinator(
  filter: GeoNodeAttributeFilter | undefined,
): GeoNodeAttributeFilterCombinator {
  return filter && isGeoNodeAttributeFilterGroup(filter)
    ? filter.combinator
    : "and";
}

function createFilter(
  conditions: readonly GeoNodeAttributeFilterCondition[],
  combinator: GeoNodeAttributeFilterCombinator,
): GeoNodeAttributeFilter | undefined {
  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return { combinator, conditions };
}

type AttributeTableState =
  | { status: "error" }
  | { status: "loading" }
  | {
      status: "load-more-error" | "loading-more" | "ready";
      result: GeoNodeDatasetFeaturePage;
    };

type ExportState =
  | { status: "error" }
  | { status: "exporting"; format: GeoNodeDatasetExportFormat }
  | { status: "idle" };

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

function downloadBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
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
  const [requestKey, setRequestKey] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadMoreControllerRef = useRef<AbortController | null>(null);
  const loadingMoreRef = useRef(false);
  const [fields, setFields] = useState<AttributeField[]>(
    filterConditions(filter).map(({ field: name, type }) => ({ name, type })),
  );
  const [draftField, setDraftField] = useState("");
  const [draftOperator, setDraftOperator] =
    useState<GeoNodeAttributeFilterOperator>("contains");
  const [draftValue, setDraftValue] = useState("");
  const [state, setState] = useState<AttributeTableState>({
    status: "loading",
  });
  const [exportState, setExportState] = useState<ExportState>({
    status: "idle",
  });

  async function exportFeatures(format: GeoNodeDatasetExportFormat) {
    setExportState({ status: "exporting", format });
    try {
      const result = await client.exportDatasetFeatures(dataset, {
        filter,
        format,
      });
      downloadBlob(result.blob, result.filename);
      setExportState({ status: "idle" });
    } catch {
      setExportState({ status: "error" });
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    loadMoreControllerRef.current?.abort();
    loadMoreControllerRef.current = null;
    loadingMoreRef.current = false;
    setState({ status: "loading" });

    void client
      .listDatasetFeatures(dataset, {
        filter,
        page: 1,
        pageSize,
        signal: controller.signal,
      })
      .then((result) => {
        if (controller.signal.aborted) return;
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
        setState({ status: "ready", result });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "error" });
      });

    return () => {
      controller.abort();
      loadMoreControllerRef.current?.abort();
      loadMoreControllerRef.current = null;
      loadingMoreRef.current = false;
    };
  }, [client, dataset, filter, requestKey]);

  const result = "result" in state ? state.result : null;

  const loadNextPage = useCallback(async () => {
    if (!result?.hasNext || loadingMoreRef.current) return;

    loadingMoreRef.current = true;
    const controller = new AbortController();
    loadMoreControllerRef.current?.abort();
    loadMoreControllerRef.current = controller;
    setState({ status: "loading-more", result });

    try {
      const nextPage = await client.listDatasetFeatures(dataset, {
        filter,
        page: result.page + 1,
        pageSize,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;

      const features = [...result.features];
      const featureIds = new Set(features.map((feature) => feature.id));
      nextPage.features.forEach((feature) => {
        if (!featureIds.has(feature.id)) {
          featureIds.add(feature.id);
          features.push(feature);
        }
      });

      setState({
        status: "ready",
        result: {
          ...nextPage,
          features,
          total: nextPage.total ?? result.total,
        },
      });
    } catch {
      if (!controller.signal.aborted) {
        setState({ status: "load-more-error", result });
      }
    } finally {
      if (loadMoreControllerRef.current === controller) {
        loadMoreControllerRef.current = null;
        loadingMoreRef.current = false;
      }
    }
  }, [client, dataset, filter, result]);

  function handleTableScroll(event: UIEvent<HTMLDivElement>) {
    const element = event.currentTarget;
    const distanceFromBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    if (distanceFromBottom <= 48) void loadNextPage();
  }

  useEffect(() => {
    const element = scrollRef.current;
    if (
      state.status === "ready" &&
      result?.hasNext &&
      element &&
      element.clientHeight > 0 &&
      element.scrollHeight <= element.clientHeight + 1
    ) {
      void loadNextPage();
    }
  }, [loadNextPage, result?.hasNext, state.status]);

  const columns = useMemo(() => {
    if (!result) return [];

    return Array.from(
      new Set(
        result.features.flatMap((feature) => Object.keys(feature.attributes)),
      ),
    );
  }, [result]);

  useEffect(() => {
    if (!result) return;

    const inferredFields = columns.map((name) => ({
      name,
      type: inferAttributeType(
        result.features.map((feature) => feature.attributes[name]),
      ),
    }));

    setFields((currentFields) => {
      const byName = new Map(
        currentFields.map((field) => [field.name, field] as const),
      );
      inferredFields.forEach((field) => byName.set(field.name, field));
      return [...byName.values()];
    });
  }, [columns, result]);

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
  const activeConditions = filterConditions(filter);
  const activeCombinator = filterCombinator(filter);

  const rangeStart = result?.features.length ? 1 : 0;
  const rangeEnd = result?.features.length ?? 0;

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
        <div className="attribute-table__exports">
          <button
            type="button"
            className="button button--secondary"
            disabled={exportState.status === "exporting"}
            onClick={() => void exportFeatures("csv")}
          >
            {exportState.status === "exporting" && exportState.format === "csv"
              ? t("export.exporting")
              : t("export.csv")}
          </button>
          <button
            type="button"
            className="button button--secondary"
            disabled={exportState.status === "exporting"}
            onClick={() => void exportFeatures("geojson")}
          >
            {exportState.status === "exporting" &&
            exportState.format === "geojson"
              ? t("export.exporting")
              : t("export.geojson")}
          </button>
          {exportState.status === "error" ? (
            <span role="alert">{t("export.error")}</span>
          ) : null}
        </div>
        <button
          type="button"
          className="attribute-table__close"
          aria-label={t("close")}
          onClick={onClose}
        >
          <CloseIcon />
        </button>
      </header>

      <div className="attribute-table__content">
        <form
          className="attribute-table__filter"
          onSubmit={(event) => {
            event.preventDefault();
            if (!selectedField || !draftValue.trim()) return;

            const nextCondition: GeoNodeAttributeFilterCondition = {
              field: selectedField.name,
              operator: draftOperator,
              type: selectedField.type,
              value: draftValue.trim(),
            };
            setDraftValue("");
            onFilterChange(
              createFilter(
                [...activeConditions, nextCondition],
                activeCombinator,
              ),
            );
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
              maxLength={maximumGeoNodeFilterValueLength}
              disabled={!selectedField}
              placeholder={t("filter.placeholder")}
              step={selectedField?.type === "number" ? "any" : undefined}
              onChange={(event) => setDraftValue(event.currentTarget.value)}
            />
          </label>
          <button
            type="submit"
            className="button button--primary"
            disabled={
              !selectedField ||
              !draftValue.trim() ||
              activeConditions.length >= maximumGeoNodeFilterConditions
            }
          >
            {activeConditions.length > 0
              ? t("filter.addCondition")
              : t("filter.apply")}
          </button>
          {filter ? (
            <button
              type="button"
              className="button button--secondary"
              onClick={() => {
                setDraftValue("");
                onFilterChange(undefined);
              }}
            >
              {t("filter.clear")}
            </button>
          ) : null}
        </form>
        {activeConditions.length > 0 ? (
          <div className="attribute-table__active-filters">
            <div className="attribute-table__active-filter-heading">
              <strong>{t("filter.activeConditions")}</strong>
              {activeConditions.length > 1 ? (
                <label>
                  <span>{t("filter.match")}</span>
                  <select
                    value={activeCombinator}
                    onChange={(event) => {
                      onFilterChange({
                        combinator: event.currentTarget
                          .value as GeoNodeAttributeFilterCombinator,
                        conditions: activeConditions,
                      });
                    }}
                  >
                    <option value="and">{t("filter.combinators.and")}</option>
                    <option value="or">{t("filter.combinators.or")}</option>
                  </select>
                </label>
              ) : null}
            </div>
            <ol>
              {activeConditions.map((condition, index) => (
                <li
                  key={`${condition.field}:${condition.operator}:${condition.value}:${index}`}
                >
                  <span>
                    <strong>{condition.field}</strong>{" "}
                    {t(`filter.operators.${condition.operator}`)}{" "}
                    <code>{condition.value}</code>
                  </span>
                  <button
                    type="button"
                    aria-label={t("filter.removeCondition", {
                      field: condition.field,
                    })}
                    title={t("filter.removeCondition", {
                      field: condition.field,
                    })}
                    onClick={() => {
                      onFilterChange(
                        createFilter(
                          activeConditions.filter(
                            (_, conditionIndex) => conditionIndex !== index,
                          ),
                          activeCombinator,
                        ),
                      );
                    }}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
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
          <div
            ref={scrollRef}
            className="attribute-table__scroll"
            onScroll={handleTableScroll}
          >
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
            {state.status === "loading-more" ? (
              <p className="attribute-table__load-more" role="status">
                {t("loadingMore")}
              </p>
            ) : null}
            {state.status === "load-more-error" ? (
              <div className="attribute-table__load-more attribute-table__load-more--error">
                <span role="alert">{t("loadMoreError")}</span>
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => void loadNextPage()}
                >
                  {t("retryLoadMore")}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
