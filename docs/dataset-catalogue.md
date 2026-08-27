# Dataset catalogue and active layers

Mirante separates datasets published in GeoNode from layers currently displayed on the map.

## Published dataset catalogue

The collapsed drawer on the right loads paginated resources from `GET /api/v2/datasets/`. GeoNode remains responsible for filtering resources according to publication state and the current user's view permissions. Mirante maps processed, published datasets with an EPSG:4326 extent to WMS layers.

Opening the drawer loads the first page. Additional pages are requested only when the user selects **Load more datasets**. A newly uploaded dataset refreshes the catalogue and remains automatically active on the map.

The search field queries GeoNode after a short input delay. It uses the standard `search` parameter with `search_fields=title` and `search_fields=abstract`, so filtering, permissions, and pagination remain server-side. Clearing the field restores the unfiltered first page.

## Active layers

The panel on the left contains only datasets added to the current map session. Each active layer supports:

- Visibility changes.
- Opacity changes.
- Removal from the current map.

Removing a layer never deletes or changes the corresponding GeoNode dataset. Users who need metadata, permissions, styles, downloads, or deletion can open **Manage datasets in GeoNode** from the user menu.

## Configuration

The management link combines `geonode.webUrl` with `geonode.datasetManagementPath`. The web URL must be the public browser-facing GeoNode origin, while `geonode.baseUrl` may remain relative and use the Mirante proxy for API requests. The official GeoNode 5.1.0 distribution uses `/catalogue/#/`; institutional distributions can override the URL and path without changing application internals.

## Current limits

- Unsaved active-layer changes are cleared by a page reload. Users can persist the current view and layer state as a GeoNode map.
- Search currently covers title and description; faceted filters are not yet available.
- Removing a layer from the map does not modify its server-side permissions or publication state.
