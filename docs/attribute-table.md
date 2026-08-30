# Attribute table

Each active dataset exposes an attribute-table action in the left layer panel. The table opens as a bottom panel so users can continue seeing the map while inspecting records.

## GeoNode compatibility

Mirante reads features directly from the dataset's standard GeoServer WFS endpoint. Requests use WFS 2.0 `GetFeature`, GeoJSON output, `EPSG:4326`, and the dataset's published qualified layer name. No custom backend or GeoNode modification is required.

Requests contain 25 records. Mirante requests one additional record as a
look-ahead so that loading can continue when a GeoServer data store does not
provide a reliable `numberMatched` value. Reaching the bottom of the table
automatically requests and appends the next page. Previously loaded rows remain
visible, and a failed additional request can be retried without discarding them.
When GeoServer supplies a valid total, the table displays it alongside the
number of rows loaded so far.

## Interaction

- Columns are derived from the attributes returned on all loaded pages.
- Null and empty values receive a localized placeholder.
- Numbers and booleans use the active interface locale.
- The locate action selects the row and fits the feature geometry extent on the map.
- The selected geometry remains highlighted when more rows load or filters change.
- A map click selects the corresponding row when that feature is currently loaded.
- Closing the table does not remove or change the active WMS layer.
- CSV and GeoJSON exports request every feature matching the active filter directly from GeoServer. Exporting is independent of the rows currently loaded.

## Current limits

- The table reads vector datasets that GeoServer exposes through WFS.
- One typed attribute filter can be applied to the table and WMS layer. See [Attribute filtering](attribute-filtering.md).
- Column ordering follows the GeoJSON property order returned by GeoServer.
- Exports are assembled by the browser, so very large result sets remain subject to browser memory and GeoServer response limits.
