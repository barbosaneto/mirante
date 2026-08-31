# Base maps

Mirante keeps base maps separate from active GeoNode datasets. The left panel lists only WMS dataset overlays, while the compact selector in the bottom toolbar controls the background map.

## Available options

- **OpenStreetMap** uses the standard light raster tiles with OpenStreetMap attribution.
- **OpenFreeMap Liberty** uses OpenFreeMap's Liberty vector style.
- **OpenFreeMap Dark** uses OpenFreeMap's Dark vector style.

The distribution registers base maps in its public configuration. Each
definition provides a stable identifier and localized labels. Raster
definitions also provide an XYZ tile URL and attribution; MapLibre style
definitions provide a public style URL. The OpenLayers facade keeps one layer
or layer group per definition and displays only the selected base map. Dataset
layers remain in place, preserving their order, visibility, and opacity when
the background changes.

Saved GeoNode maps record the stable identifier in Mirante's versioned map data
and restore it when opened. If a distribution no longer provides that
identifier, its configured default is used.

```ts
map: {
  defaultBaseMapId: "institutional",
  baseMaps: [
    {
      id: "institutional",
      labels: { en: "Institutional", "pt-BR": "Institucional" },
      tileUrl: "https://maps.example.org/{z}/{x}/{y}.png",
      attributions: ["Map data © Example"],
    },
  ],
  initialCenter: [-52, -15],
  initialZoom: 4,
}
```

MapLibre-compatible vector styles use a source-specific definition:

```ts
{
  id: "open-free-map-liberty",
  labels: { en: "OpenFreeMap Liberty", "pt-BR": "OpenFreeMap Liberty" },
  type: "maplibre-style",
  styleUrl: "https://tiles.openfreemap.org/styles/liberty",
  attributions: ["OpenFreeMap", "OpenMapTiles", "OpenStreetMap contributors"],
}
```

## Current limits

- The official distribution uses OpenStreetMap for new sessions and older maps
  without a stored identifier.
- The public contract covers XYZ raster sources and MapLibre-compatible vector
  styles. WMS and WMTS base maps require future source-specific definitions.
