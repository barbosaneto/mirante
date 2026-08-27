# Attribute table

Each active dataset exposes an attribute-table action in the left layer panel. The table opens as a bottom panel so users can continue seeing the map while inspecting records.

## GeoNode compatibility

Mirante reads features directly from the dataset's standard GeoServer WFS endpoint. Requests use WFS 2.0 `GetFeature`, GeoJSON output, `EPSG:4326`, and the dataset's published qualified layer name. No custom backend or GeoNode modification is required.

Pages contain 25 records. Mirante requests one additional record as a look-ahead so that navigation remains available when a GeoServer data store does not provide a reliable `numberMatched` value. When GeoServer supplies a valid total, the table displays the full record count and page count.

## Interaction

- Columns are derived from the attributes returned on the current page.
- Null and empty values receive a localized placeholder.
- Numbers and booleans use the active interface locale.
- The locate action selects the row and fits the feature geometry extent on the map.
- Closing the table does not remove or change the active WMS layer.

## Current limits

- The table reads vector datasets that GeoServer exposes through WFS.
- Attribute filters are not yet available; they are planned for the next increment.
- Selecting a row locates its geometry but does not yet draw a persistent highlight.
- Column ordering follows the GeoJSON property order returned by GeoServer.
