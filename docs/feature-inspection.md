# Layer navigation and feature inspection

Mirante keeps map navigation and feature queries inside the OpenLayers package so application components do not depend on OpenLayers objects.

## Layer navigation

Every active dataset has a **Zoom to** action. The map facade retains its EPSG:4326 dataset extent and fits the OpenLayers view to that extent without changing visibility, opacity, or server-side state.

## Feature inspection

A single map click queries every visible dataset layer whose opacity is greater than zero. For each layer, OpenLayers builds a standard WMS GetFeatureInfo request using:

- `INFO_FORMAT=application/json`.
- `FEATURE_COUNT=10`.
- The current map coordinate, resolution, and projection.

Requests retain the current browser session and use the dataset's configured WMS URL. GeoServer GeoJSON responses are mapped to a small domain model containing the dataset identifier, dataset title, optional feature identifier, geometry, and published properties. The dialog presents only the attributes, while the geometry feeds the shared map selection.

If visible layers overlap, the dialog groups returned features by dataset and feature identifier. Attribute names come from GeoServer, while interface labels, states, booleans, empty values, and numeric formatting use Mirante internationalization.

The first returned feature becomes the current selection. OpenLayers draws its geometry in a dedicated vector layer above WMS layers. Selecting a row in the attribute table updates the same highlight and map extent; selecting a feature on the map updates the matching table row when it is present on the current page. Selection remains stable while the user changes pages or applies filters.

## Current limits

- Up to ten features are requested from each visible layer at a clicked location.
- Feature attributes are read-only.
- Raster GetFeatureInfo support depends on the capabilities and response exposed by GeoServer for that layer.
- The first dialog does not provide attribute sorting, copying, or links to the full GeoNode resource.
