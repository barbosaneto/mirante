import type { GeoNodeDataset, GeoNodeDatasetClient } from "@mirante/geonode";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { CheckIcon, CloseIcon, LayersIcon, PlusIcon } from "./Icons";

type CatalogueStatus = "error" | "loading" | "loading-more" | "ready";

interface DatasetCatalogDrawerProps {
  activeDatasetIds: readonly number[];
  client: GeoNodeDatasetClient;
  open: boolean;
  refreshKey: number;
  onAdd: (dataset: GeoNodeDataset) => void;
  onOpenChange: (open: boolean) => void;
}

const pageSize = 20;

export function DatasetCatalogDrawer({
  activeDatasetIds,
  client,
  onAdd,
  onOpenChange,
  open,
  refreshKey,
}: DatasetCatalogDrawerProps) {
  const { t } = useTranslation("layers");
  const [datasets, setDatasets] = useState<readonly GeoNodeDataset[]>([]);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<CatalogueStatus>("loading");
  const [total, setTotal] = useState(0);
  const activeIds = new Set(activeDatasetIds);
  const hasMore = page * pageSize < total;

  useEffect(() => {
    if (!open) {
      return;
    }

    const controller = new AbortController();
    setDatasets([]);
    setPage(0);
    setTotal(0);
    setStatus("loading");

    void client
      .listDatasets({ page: 1, pageSize, signal: controller.signal })
      .then((result) => {
        setDatasets(result.datasets);
        setPage(result.page);
        setTotal(result.total);
        setStatus("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setStatus("error");
        }
      });

    return () => controller.abort();
  }, [client, open, refreshKey]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onOpenChange, open]);

  async function loadMore() {
    if (status !== "ready" || !hasMore) {
      return;
    }

    setStatus("loading-more");

    try {
      const result = await client.listDatasets({
        page: page + 1,
        pageSize,
      });
      setDatasets((current) => {
        const merged = new Map(current.map((dataset) => [dataset.id, dataset]));
        result.datasets.forEach((dataset) => merged.set(dataset.id, dataset));
        return [...merged.values()];
      });
      setPage(result.page);
      setTotal(result.total);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      {!open ? (
        <button
          type="button"
          className="dataset-catalog-toggle"
          aria-controls="dataset-catalog"
          aria-expanded="false"
          onClick={() => onOpenChange(true)}
        >
          <span className="shell-icon">
            <LayersIcon />
          </span>
          <span>{t("catalogue.open")}</span>
        </button>
      ) : null}

      {open ? (
        <aside
          id="dataset-catalog"
          className="dataset-catalog"
          aria-labelledby="dataset-catalog-title"
        >
          <header className="dataset-catalog__header">
            <div>
              <p>{t("catalogue.eyebrow")}</p>
              <h2 id="dataset-catalog-title">{t("catalogue.title")}</h2>
            </div>
            <button
              type="button"
              className="dataset-catalog__close"
              aria-label={t("catalogue.close")}
              onClick={() => onOpenChange(false)}
            >
              <CloseIcon />
            </button>
          </header>

          <div className="dataset-catalog__content">
            {status === "loading" ? (
              <p className="dataset-catalog__state" role="status">
                {t("catalogue.loading")}
              </p>
            ) : null}

            {status === "error" ? (
              <div className="dataset-catalog__state" role="alert">
                <p>{t("catalogue.error")}</p>
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => {
                    setStatus("loading");
                    void client
                      .listDatasets({ page: 1, pageSize })
                      .then((result) => {
                        setDatasets(result.datasets);
                        setPage(result.page);
                        setTotal(result.total);
                        setStatus("ready");
                      })
                      .catch(() => setStatus("error"));
                  }}
                >
                  {t("catalogue.retry")}
                </button>
              </div>
            ) : null}

            {status === "ready" && datasets.length === 0 ? (
              <p className="dataset-catalog__state">{t("catalogue.empty")}</p>
            ) : null}

            {datasets.length > 0 ? (
              <ul className="dataset-catalog__list">
                {datasets.map((dataset) => {
                  const active = activeIds.has(dataset.id);

                  return (
                    <li key={dataset.id}>
                      <div>
                        <strong title={dataset.title}>{dataset.title}</strong>
                        <span>{dataset.layerName}</span>
                      </div>
                      <button
                        type="button"
                        disabled={active}
                        aria-label={
                          active
                            ? t("catalogue.added", { name: dataset.title })
                            : t("catalogue.add", { name: dataset.title })
                        }
                        title={
                          active
                            ? t("catalogue.added", { name: dataset.title })
                            : t("catalogue.add", { name: dataset.title })
                        }
                        onClick={() => onAdd(dataset)}
                      >
                        {active ? <CheckIcon /> : <PlusIcon />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {hasMore && status !== "error" ? (
              <button
                type="button"
                className="button button--secondary dataset-catalog__more"
                disabled={status === "loading-more"}
                onClick={() => void loadMore()}
              >
                {status === "loading-more"
                  ? t("catalogue.loadingMore")
                  : t("catalogue.loadMore")}
              </button>
            ) : null}
          </div>
        </aside>
      ) : null}
    </>
  );
}
