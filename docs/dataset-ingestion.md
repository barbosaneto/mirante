# Dataset ingestion

The initial Mirante proof of concept uploads GeoJSON, KML, and zipped Shapefile datasets to an unmodified GeoNode 5.1.0 instance and displays the published WMS layer in OpenLayers.

## User flow

1. Sign in with a GeoNode account that has the resource creation permission described in [Upload permissions](upload-permissions.md).
2. Open **Upload dataset** from the map toolbar.
3. Select or drop one `.geojson`, `.kml`, or `.zip` file. ZIP archives must contain the components of one Shapefile.
4. Review the local validation result and start the upload.
5. Keep the dialog open while GeoNode processes the dataset.
6. After publication, Mirante adds the WMS layer and fits the map to its geographic extent.
7. Use the layers panel to change visibility and opacity.

## GeoNode request flow

Mirante uses the browser's authenticated Django session and standard CSRF protection:

1. `GET /account/logout/` provides a CSRF token for the authenticated session without ending it.
2. `POST /api/v2/uploads/upload` starts ingestion with `base_file`, `action=upload`, and `store_spatial_files=true`. ZIP uploads also include the same archive as `zip_file`, which tells GeoNode to inspect its contents and select the Shapefile handler.
3. `GET /api/v2/resource-service/execution-status/{execution_id}` reports `ready`, `running`, `finished`, or `failed`.
4. A finished execution exposes the created resource ID in `output_params.resources`.
5. `GET /api/v2/datasets/{id}` provides the title, WMS endpoint, layer name, and EPSG:4326 extent.
6. OpenLayers requests WMS tiles through the configured GeoNode route.

No custom GeoNode endpoint, model, setting, or plugin is required.

## Validation and limits

- The client accepts one `.geojson`, `.kml`, or `.zip` file up to 50 MiB.
- GeoJSON must contain an object with `type: "FeatureCollection"` and a `features` array.
- KML must be a well-formed XML document with a `kml` root element.
- ZIP files receive a basic archive signature check in the browser. GeoNode validates that the archive contains a usable Shapefile, including its required companion files.
- GeoNode applies its own file type, permission, upload size, parallelism, and ingestion validation after local validation succeeds.
- The server may enforce a lower upload limit than the client.
- The upload dialog must remain open during this initial implementation. Upload recovery after a page reload is not yet implemented.
- Published layers remain in the current Mirante session. Reloading the page does not restore them yet.

The same-origin deployment topology described in [Authentication](authentication.md) also applies to dataset ingestion and WMS requests.
