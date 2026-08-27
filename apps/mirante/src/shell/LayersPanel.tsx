import type { GeoNodeDataset } from "@mirante/geonode";
import type { DatasetLayerLoadStatus } from "@mirante/map";
import { useTranslation } from "react-i18next";

import { LayersIcon } from "./Icons";

export interface DisplayedDataset {
  dataset: GeoNodeDataset;
  loadStatus: DatasetLayerLoadStatus;
  opacity: number;
  visible: boolean;
}

interface LayersPanelProps {
  datasets: readonly DisplayedDataset[];
  onOpacityChange: (id: number, opacity: number) => void;
  onVisibilityChange: (id: number, visible: boolean) => void;
}

export function LayersPanel({
  datasets,
  onOpacityChange,
  onVisibilityChange,
}: LayersPanelProps) {
  const { t } = useTranslation("layers");
  const layerCount = datasets.length + 1;

  return (
    <aside className="layers-panel" aria-labelledby="layers-panel-title">
      <header className="layers-panel__header">
        <span className="shell-icon shell-icon--primary">
          <LayersIcon />
        </span>
        <h1 id="layers-panel-title">{t("title")}</h1>
        <span
          className="layers-panel__count"
          aria-label={t("count", { count: layerCount })}
        >
          {layerCount}
        </span>
      </header>

      {datasets.length > 0 ? (
        <section className="layer-group" aria-labelledby="datasets-group-title">
          <h2 id="datasets-group-title">{t("datasets")}</h2>
          {datasets.map(({ dataset, loadStatus, opacity, visible }) => (
            <article className="dataset-layer" key={dataset.id}>
              <div className="layer-row">
                <input
                  className="layer-row__visibility"
                  type="checkbox"
                  checked={visible}
                  aria-label={t("visibility", { name: dataset.title })}
                  onChange={(event) =>
                    onVisibilityChange(dataset.id, event.currentTarget.checked)
                  }
                />
                <span
                  className={`layer-row__swatch layer-row__swatch--dataset layer-row__swatch--${loadStatus}`}
                  aria-hidden="true"
                />
                <span className="layer-row__name" title={dataset.title}>
                  {dataset.title}
                </span>
                <span
                  className={`layer-row__type layer-row__type--${loadStatus}`}
                >
                  {loadStatus === "ready" ? "WMS" : t(`status.${loadStatus}`)}
                </span>
              </div>
              <label className="layer-opacity">
                <span>{t("opacity", { name: dataset.title })}</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(opacity * 100)}
                  aria-label={t("opacity", { name: dataset.title })}
                  onChange={(event) =>
                    onOpacityChange(
                      dataset.id,
                      Number(event.currentTarget.value) / 100,
                    )
                  }
                />
                <output>{Math.round(opacity * 100)}%</output>
              </label>
            </article>
          ))}
        </section>
      ) : null}

      <section className="layer-group" aria-labelledby="basemap-group-title">
        <h2 id="basemap-group-title">{t("baseMap")}</h2>
        <div className="layer-row">
          <span className="layer-row__status" aria-hidden="true" />
          <span className="layer-row__swatch" aria-hidden="true" />
          <span className="layer-row__name">{t("darkMatter")}</span>
          <span className="layer-row__type">XYZ</span>
        </div>
      </section>

      {datasets.length === 0 ? (
        <p className="layers-panel__empty">{t("empty")}</p>
      ) : null}
    </aside>
  );
}
