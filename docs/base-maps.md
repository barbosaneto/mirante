# Base maps

Mirante keeps base maps separate from active GeoNode datasets. The left panel lists only WMS dataset overlays, while the compact selector in the bottom toolbar controls the background map.

## Available options

- **Dark Matter** uses CARTO raster tiles with OpenStreetMap and CARTO attribution.
- **OpenStreetMap** uses the standard light raster tiles with OpenStreetMap attribution.

The distribution registers base maps in its public configuration. Each
definition provides a stable identifier, localized labels, an XYZ tile URL, and
the attribution required by its provider. The OpenLayers facade creates sources
from these definitions and switches the source of a single base layer. Dataset
layers remain in place, preserving their visibility and opacity when the
background changes.

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

## Current limits

- The official distribution uses OpenStreetMap for new sessions and older maps
  without a stored identifier.
- The first public contract covers XYZ raster sources. WMS, WMTS, and vector
  tile base maps require future source-specific definitions.
