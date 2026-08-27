import "ol/ol.css";

import { defaults as defaultControls } from "ol/control/defaults.js";
import TileLayer from "ol/layer/Tile.js";
import OlMap from "ol/Map.js";
import { fromLonLat } from "ol/proj.js";
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

export interface MapFacade {
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

  return {
    destroy() {
      map.setTarget(undefined);
      map.dispose();
    },
  };
}
