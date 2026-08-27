import {
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
  onClose: () => void;
  onLocate: (feature: GeoNodeDatasetFeature) => void;
}

type AttributeTableState =
  | { status: "error" }
  | { status: "loading" }
  | { status: "ready"; result: GeoNodeDatasetFeaturePage };

const pageSize = 25;

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
  onClose,
  onLocate,
}: AttributeTableProps) {
  const { t } = useTranslation("attributes");
  const titleId = useId();
  const [page, setPage] = useState(1);
  const [requestKey, setRequestKey] = useState(0);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(
    null,
  );
  const [state, setState] = useState<AttributeTableState>({
    status: "loading",
  });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });

    void client
      .listDatasetFeatures(dataset, {
        page,
        pageSize,
        signal: controller.signal,
      })
      .then((result) => setState({ status: "ready", result }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "error" });
      });

    return () => controller.abort();
  }, [client, dataset, page, requestKey]);

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
          <p className="attribute-table__state">{t("empty")}</p>
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
                          setSelectedFeatureId(feature.id);
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
