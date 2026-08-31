import type { GeoNodeDataset } from "@mirante/geonode";
import type { DatasetLayerLoadStatus } from "@mirante/map";
import { useState, type DragEvent, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";

import { FocusIcon, GripIcon, LayersIcon, TableIcon, TrashIcon } from "./Icons";

export interface DisplayedDataset {
  dataset: GeoNodeDataset;
  loadStatus: DatasetLayerLoadStatus;
  opacity: number;
  visible: boolean;
}

interface LayersPanelProps {
  datasets: readonly DisplayedDataset[];
  filteredDatasetIds: readonly number[];
  onOpacityChange: (id: number, opacity: number) => void;
  onOpenAttributes: (id: number) => void;
  onReorder: (sourceId: number, targetId: number) => void;
  onRemove: (id: number) => void;
  onZoom: (id: number) => void;
  onVisibilityChange: (id: number, visible: boolean) => void;
}

export function LayersPanel({
  datasets,
  filteredDatasetIds,
  onOpacityChange,
  onOpenAttributes,
  onReorder,
  onRemove,
  onVisibilityChange,
  onZoom,
}: LayersPanelProps) {
  const { t } = useTranslation("layers");
  const layerCount = datasets.length;
  const [draggedDatasetId, setDraggedDatasetId] = useState<number | null>(null);
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);

  function startDragging(event: DragEvent, id: number) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(id));
    setDraggedDatasetId(id);
  }

  function finishDragging() {
    setDraggedDatasetId(null);
    setDropTargetId(null);
  }

  function dropDataset(event: DragEvent, targetId: number) {
    event.preventDefault();
    const sourceId =
      draggedDatasetId ?? Number(event.dataTransfer.getData("text/plain"));
    if (Number.isInteger(sourceId)) onReorder(sourceId, targetId);
    finishDragging();
  }

  function reorderWithKeyboard(
    event: KeyboardEvent<HTMLButtonElement>,
    id: number,
  ) {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const currentIndex = datasets.findIndex((item) => item.dataset.id === id);
    const targetIndex = currentIndex + (event.key === "ArrowUp" ? -1 : 1);
    const target = datasets[targetIndex];
    if (target) onReorder(id, target.dataset.id);
  }

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
            <article
              className={`dataset-layer${draggedDatasetId === dataset.id ? " dataset-layer--dragging" : ""}${dropTargetId === dataset.id ? " dataset-layer--drop-target" : ""}`}
              key={dataset.id}
              onDragOver={(event) => {
                if (
                  draggedDatasetId !== null &&
                  draggedDatasetId !== dataset.id
                ) {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDropTargetId(dataset.id);
                }
              }}
              onDrop={(event) => dropDataset(event, dataset.id)}
            >
              <div className="layer-row">
                <button
                  type="button"
                  className="layer-row__drag-handle"
                  draggable
                  aria-label={t("reorder", { name: dataset.title })}
                  title={t("reorderHelp")}
                  onDragStart={(event) => startDragging(event, dataset.id)}
                  onDragEnd={finishDragging}
                  onKeyDown={(event) => reorderWithKeyboard(event, dataset.id)}
                >
                  <GripIcon />
                </button>
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
                  {loadStatus === "ready"
                    ? filteredDatasetIds.includes(dataset.id)
                      ? t("filtered")
                      : "WMS"
                    : t(`status.${loadStatus}`)}
                </span>
                <div className="layer-row__actions">
                  <button
                    type="button"
                    className="layer-row__attributes"
                    aria-label={t("openAttributes", { name: dataset.title })}
                    title={t("openAttributes", { name: dataset.title })}
                    onClick={() => onOpenAttributes(dataset.id)}
                  >
                    <TableIcon />
                  </button>
                  <button
                    type="button"
                    className="layer-row__zoom"
                    aria-label={t("zoomTo", { name: dataset.title })}
                    title={t("zoomTo", { name: dataset.title })}
                    onClick={() => onZoom(dataset.id)}
                  >
                    <FocusIcon />
                  </button>
                  <button
                    type="button"
                    className="layer-row__remove"
                    aria-label={t("remove", { name: dataset.title })}
                    title={t("remove", { name: dataset.title })}
                    onClick={() => onRemove(dataset.id)}
                  >
                    <TrashIcon />
                  </button>
                </div>
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

      {datasets.length === 0 ? (
        <p className="layers-panel__empty">{t("empty")}</p>
      ) : null}
    </aside>
  );
}
