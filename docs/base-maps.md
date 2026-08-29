# Base maps

Mirante keeps base maps separate from active GeoNode datasets. The left panel lists only WMS dataset overlays, while the compact selector in the bottom toolbar controls the background map.

## Available options

- **Dark Matter** uses CARTO raster tiles with OpenStreetMap and CARTO attribution.
- **OpenStreetMap** uses the standard light raster tiles with OpenStreetMap attribution.

The OpenLayers facade owns the tile sources and switches the source of a single
base layer. Dataset layers remain in place, preserving their visibility and
opacity when the background changes. Saved GeoNode maps record the selected base
map in Mirante's versioned map data and restore it when opened.

## Current limits

- OpenStreetMap is the default for a new session and for older maps without a
  stored base-map identifier.
- Institutional distributions cannot yet register additional base maps through public configuration.
