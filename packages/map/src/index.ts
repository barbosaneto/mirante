import "ol/ol.css";

import type { MapCommandApi, MapViewOptions } from "@mirante/sdk";
import { defaults as defaultControls } from "ol/control/defaults.js";
import TileLayer from "ol/layer/Tile.js";
import OlMap from "ol/Map.js";
import { fromLonLat, transformExtent } from "ol/proj.js";
import TileWMS from "ol/source/TileWMS.js";
import XYZ from "ol/source/XYZ.js";
import View from "ol/View.js";

export type GeographicCoordinate = readonly [
  longitude: number,
  latitude: number,
];

export interface CreateMapOptions {
  target: HTMLElement;
  initialCenter?: GeographicCoordinate;
  initialZoom?: number;
}

export type DatasetLayerLoadStatus = "error" | "loading" | "ready";

export interface DatasetMapLayerOptions {
  id: number;
  layerName: string;
  title: string;
  wmsUrl: string;
  extent: readonly [minX: number, minY: number, maxX: number, maxY: number];
  onLoadStatusChange?: (status: DatasetLayerLoadStatus) => void;
}

export interface MapFacade extends MapCommandApi {
  addDatasetLayer(options: DatasetMapLayerOptions): void;
  removeDatasetLayer(id: number): void;
  setDatasetLayerOpacity(id: number, opacity: number): void;
  setDatasetLayerVisibility(id: number, visible: boolean): void;
  destroy(): void;
}

const defaultCenter: GeographicCoordinate = [-52, -15];
const defaultZoom = 4;

const darkBasemapAttribution = [
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  '&copy; <a href="https://carto.com/attributions">CARTO</a>',
];

export function createMap({
  target,
  initialCenter = defaultCenter,
  initialZoom = defaultZoom,
}: CreateMapOptions): MapFacade {
  const map = new OlMap({
    target,
    controls: defaultControls({
      attributionOptions: {
        collapsible: false,
      },
    }),
    layers: [
      new TileLayer({
        source: new XYZ({
          attributions: darkBasemapAttribution,
          crossOrigin: "anonymous",
          url: "https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        }),
      }),
    ],
    view: new View({
      center: fromLonLat([initialCenter[0], initialCenter[1]]),
      zoom: initialZoom,
    }),
  });

  const datasetLayers = new Map<number, TileLayer<TileWMS>>();

  return {
    addDatasetLayer({
      extent,
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
      map.addLayer(layer);
      map
        .getView()
        .fit(transformExtent([...extent], "EPSG:4326", "EPSG:3857"), {
          duration: 350,
          maxZoom: 14,
          padding: [72, 72, 72, 380],
        });
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
      }
    },
    setDatasetLayerOpacity(id, opacity) {
      datasetLayers.get(id)?.setOpacity(Math.max(0, Math.min(1, opacity)));
    },
    setDatasetLayerVisibility(id, visible) {
      datasetLayers.get(id)?.setVisible(visible);
    },
    destroy() {
      datasetLayers.clear();
      map.setTarget(undefined);
      map.dispose();
    },
  };
}
