# Dataset catalogue and active layers

Mirante separates datasets published in GeoNode from layers currently displayed on the map.

## Published dataset catalogue

The collapsed drawer on the right loads paginated resources from `GET /api/v2/datasets/`. GeoNode remains responsible for filtering resources according to publication state and the current user's view permissions. Mirante maps processed, published datasets with an EPSG:4326 extent to WMS layers.

Opening the drawer loads the first page. Additional pages are requested only when the user selects **Load more datasets**. A newly uploaded dataset refreshes the catalogue and remains automatically active on the map.

## Active layers

The panel on the left contains only datasets added to the current map session. Each active layer supports:

- Visibility changes.
- Opacity changes.
- Removal from the current map.

Removing a layer never deletes or changes the corresponding GeoNode dataset. Users who need metadata, permissions, styles, downloads, or deletion can open **Manage datasets in GeoNode** from the user menu.

## Configuration

The management link combines `geonode.webUrl` with `geonode.datasetManagementPath`. The web URL must be the public browser-facing GeoNode origin, while `geonode.baseUrl` may remain relative and use the Mirante proxy for API requests. The official GeoNode 5.1.0 distribution uses `/catalogue/#/`; institutional distributions can override the URL and path without changing application internals.

## Current limits

- Active layers are stored only in the current browser session and are cleared by a page reload.
- The first catalogue version supports pagination but does not provide text or faceted search.
- Removing a layer from the map does not modify its server-side permissions or publication state.
