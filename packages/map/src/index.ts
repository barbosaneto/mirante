import "ol/ol.css";

import type { MapCommandApi, MapViewOptions } from "@mirante/sdk";
import { defaults as defaultControls } from "ol/control/defaults.js";
import TileLayer from "ol/layer/Tile.js";
import OlMap from "ol/Map.js";
import { fromLonLat, toLonLat, transformExtent } from "ol/proj.js";
import TileWMS from "ol/source/TileWMS.js";
import XYZ from "ol/source/XYZ.js";
import View from "ol/View.js";

import { parseWmsFeatureInfo, type DatasetFeatureInfo } from "./featureInfo";

export type { DatasetFeatureInfo } from "./featureInfo";

export type GeographicCoordinate = readonly [
  longitude: number,
  latitude: number,
];

export interface CreateMapOptions {
  target: HTMLElement;
  initialCenter?: GeographicCoordinate;
  initialZoom?: number;
  fetch?: typeof globalThis.fetch;
}

export type DatasetLayerLoadStatus = "error" | "loading" | "ready";
export type BaseMapId = "dark-matter" | "open-street-map";

export interface DatasetMapLayerOptions {
  id: number;
  layerName: string;
  title: string;
  wmsUrl: string;
  extent: readonly [minX: number, minY: number, maxX: number, maxY: number];
  fit?: boolean;
  onLoadStatusChange?: (status: DatasetLayerLoadStatus) => void;
}

export interface MapFacade extends MapCommandApi {
  addDatasetLayer(options: DatasetMapLayerOptions): void;
  fitDatasetLayer(id: number): void;
  subscribeFeatureInfo(listener: (event: FeatureInfoEvent) => void): () => void;
  removeDatasetLayer(id: number): void;
  setDatasetLayerOpacity(id: number, opacity: number): void;
  setDatasetLayerVisibility(id: number, visible: boolean): void;
  setBaseMap(id: BaseMapId): void;
  getView(): MapViewOptions;
  destroy(): void;
}

export type FeatureInfoEvent =
  | { status: "error" }
  | { status: "loading" }
  | { status: "ready"; features: readonly DatasetFeatureInfo[] };

const defaultCenter: GeographicCoordinate = [-52, -15];
const defaultZoom = 4;

const darkBasemapAttribution = [
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  '&copy; <a href="https://carto.com/attributions">CARTO</a>',
];

const openStreetMapAttribution = [
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
];

export function createMap({
  target,
  initialCenter = defaultCenter,
  initialZoom = defaultZoom,
  fetch: fetchImplementation = globalThis.fetch,
}: CreateMapOptions): MapFacade {
  const baseMapSources: Record<BaseMapId, XYZ> = {
    "dark-matter": new XYZ({
      attributions: darkBasemapAttribution,
      crossOrigin: "anonymous",
      url: "https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
    }),
    "open-street-map": new XYZ({
      attributions: openStreetMapAttribution,
      crossOrigin: "anonymous",
      url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    }),
  };
  const baseMapLayer = new TileLayer({
    source: baseMapSources["dark-matter"],
  });
  const map = new OlMap({
    target,
    controls: defaultControls({
      attributionOptions: {
        collapsible: false,
      },
    }),
    layers: [baseMapLayer],
    view: new View({
      center: fromLonLat([initialCenter[0], initialCenter[1]]),
      zoom: initialZoom,
    }),
  });

  const datasetLayers = new Map<number, TileLayer<TileWMS>>();
  const datasetExtents = new Map<
    number,
    readonly [number, number, number, number]
  >();
  const featureInfoListeners = new Set<(event: FeatureInfoEvent) => void>();
  let featureInfoRequest = 0;

  function fitDatasetExtent(extent: readonly [number, number, number, number]) {
    map.getView().fit(transformExtent([...extent], "EPSG:4326", "EPSG:3857"), {
      duration: 350,
      maxZoom: 14,
      padding: [72, 72, 72, 380],
    });
  }

  function publishFeatureInfo(event: FeatureInfoEvent) {
    featureInfoListeners.forEach((listener) => listener(event));
  }

  map.on("singleclick", (event) => {
    const view = map.getView();
    const resolution = view.getResolution();
    const projection = view.getProjection();
    const queryableLayers = [...datasetLayers.entries()].filter(
      ([, layer]) => layer.getVisible() && layer.getOpacity() > 0,
    );

    if (resolution === undefined || queryableLayers.length === 0) {
      return;
    }

    const request = ++featureInfoRequest;
    publishFeatureInfo({ status: "loading" });

    void Promise.allSettled(
      queryableLayers.map(async ([datasetId, layer]) => {
        const source = layer.getSource();
        const url = source?.getFeatureInfoUrl(
          event.coordinate,
          resolution,
          projection,
          {
            FEATURE_COUNT: 10,
            INFO_FORMAT: "application/json",
          },
        );

        if (!url) {
          return [];
        }

        const response = await fetchImplementation(url, {
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error(
            `WMS feature request failed with status ${response.status}.`,
          );
        }

        return parseWmsFeatureInfo(
          datasetId,
          String(layer.get("title") ?? datasetId),
          await response.json(),
        );
      }),
    ).then((results) => {
      if (request !== featureInfoRequest) {
        return;
      }

      const successfulResults = results.filter(
        (result): result is PromiseFulfilledResult<DatasetFeatureInfo[]> =>
          result.status === "fulfilled",
      );

      if (successfulResults.length === 0) {
        publishFeatureInfo({ status: "error" });
        return;
      }

      publishFeatureInfo({
        status: "ready",
        features: successfulResults.flatMap((result) => result.value),
      });
    });
  });

  return {
    addDatasetLayer({
      extent,
      fit = true,
      id,
      layerName,
      onLoadStatusChange,
      title,
      wmsUrl,
    }) {
      const existingLayer = datasetLayers.get(id);

      if (existingLayer) {
        map.removeLayer(existingLayer);
      }

      const source = new TileWMS({
        crossOrigin: "anonymous",
        params: {
          LAYERS: layerName,
          TILED: true,
        },
        url: wmsUrl,
      });
      const layer = new TileLayer({ source });
      let pendingTiles = 0;

      layer.set("title", title);
      source.on("tileloadstart", () => {
        pendingTiles += 1;
        onLoadStatusChange?.("loading");
      });
      source.on("tileloadend", () => {
        pendingTiles = Math.max(0, pendingTiles - 1);

        if (pendingTiles === 0) {
          onLoadStatusChange?.("ready");
        }
      });
      source.on("tileloaderror", () => {
        pendingTiles = Math.max(0, pendingTiles - 1);
        onLoadStatusChange?.("error");
      });

      datasetLayers.set(id, layer);
      datasetExtents.set(id, extent);
      map.addLayer(layer);
      if (fit) {
        fitDatasetExtent(extent);
      }
    },
    fitDatasetLayer(id) {
      const extent = datasetExtents.get(id);
      if (extent) fitDatasetExtent(extent);
    },
    getView() {
      const view = map.getView();
      const center = toLonLat(
        view.getCenter() ?? fromLonLat([...defaultCenter]),
      );

      return {
        center: [center[0] ?? defaultCenter[0], center[1] ?? defaultCenter[1]],
        zoom: view.getZoom() ?? defaultZoom,
      };
    },
    setView({ center, zoom }: MapViewOptions) {
      map.getView().animate({
        center: fromLonLat([center[0], center[1]]),
        duration: 250,
        zoom,
      });
    },
    removeDatasetLayer(id) {
      const layer = datasetLayers.get(id);

      if (layer) {
        map.removeLayer(layer);
        datasetLayers.delete(id);
        datasetExtents.delete(id);
      }
    },
    setDatasetLayerOpacity(id, opacity) {
      datasetLayers.get(id)?.setOpacity(Math.max(0, Math.min(1, opacity)));
    },
    setDatasetLayerVisibility(id, visible) {
      datasetLayers.get(id)?.setVisible(visible);
    },
    setBaseMap(id) {
      baseMapLayer.setSource(baseMapSources[id]);
    },
    subscribeFeatureInfo(listener) {
      featureInfoListeners.add(listener);
      return () => featureInfoListeners.delete(listener);
    },
    destroy() {
      featureInfoRequest += 1;
      featureInfoListeners.clear();
      datasetLayers.clear();
      datasetExtents.clear();
      map.setTarget(undefined);
      map.dispose();
    },
  };
}
