# Base maps

Mirante keeps base maps separate from active GeoNode datasets. The left panel lists only WMS dataset overlays, while the compact selector in the bottom toolbar controls the background map.

## Available options

- **Dark Matter** uses CARTO raster tiles with OpenStreetMap and CARTO attribution.
- **OpenStreetMap** uses the standard light raster tiles with OpenStreetMap attribution.

The OpenLayers facade owns the tile sources and switches the source of a single base layer. Dataset layers remain in place, preserving their visibility and opacity when the background changes.

## Current limits

- Dark Matter is the default after every application reload.
- The selected base map is not yet stored in GeoNode map resources.
- Institutional distributions cannot yet register additional base maps through public configuration.
