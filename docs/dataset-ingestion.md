# Dataset ingestion

The initial Mirante proof of concept uploads GeoJSON, KML, and zipped Shapefile datasets to an unmodified GeoNode 5.1.0 instance and displays the published WMS layer in OpenLayers.

## User flow

1. Sign in with a GeoNode account that has the resource creation permission described in [Upload permissions](upload-permissions.md).
2. Open **Upload dataset** from the map toolbar.
3. Select or drop one `.geojson`, `.kml`, or `.zip` file. ZIP archives must contain the components of one Shapefile.
4. Optionally provide a catalogue title and description. Empty fields preserve GeoNode's generated metadata.
5. When visibility selection is enabled, choose public, private, or one of the uploader's GeoNode groups. Private is selected by default.
6. Optionally choose a polygon or point style. Leaving **GeoNode default** selected preserves the existing styling behavior.
7. Keep the dialog open while GeoNode processes the dataset, metadata, style, and permissions.
8. After publication, Mirante adds the WMS layer and fits the map to its geographic extent.
9. Use the layers panel to change visibility and opacity.

## GeoNode request flow

Mirante uses the browser's authenticated Django session and standard CSRF protection:

1. `GET /account/logout/` provides a CSRF token for the authenticated session without ending it.
2. `POST /api/v2/uploads/upload` starts ingestion with `base_file`, `action=upload`, and `store_spatial_files=true`. ZIP uploads also include the same archive as `zip_file`, which tells GeoNode to inspect its contents and select the Shapefile handler. Consequently, a ZIP upload's multipart request is approximately twice the archive size; every reverse proxy in front of Mirante must allow slightly more than twice the configured frontend file limit.
3. `GET /api/v2/resource-service/execution-status/{execution_id}` reports `ready`, `running`, `finished`, or `failed`.
4. A finished execution exposes the created resource ID in `output_params.resources`.
5. `GET /api/v2/datasets/{id}` provides the title, WMS endpoint, layer name, and EPSG:4326 extent.
6. When optional metadata is present, `PATCH /api/v2/datasets/{id}` updates `title` and `abstract` through the standard dataset serializer.
7. When an optional style is present, Mirante generates an SLD 1.0 file and starts another standard importer execution with `action=resource_style_upload` and `resource_pk={id}`. The multipart request provides the SLD through both `base_file`, used for handler selection, and `sld_file`, used by GeoNode 5.1.0 during style application. GeoNode persists the style and applies it through GeoServer.
8. When visibility selection is enabled, `GET /api/v2/users/{user_id}/groups` supplies the uploader's group choices. After ingestion, Mirante reads and updates `GET/PUT /api/v2/resources/{id}/permissions`, follows the permission execution through the standard execution-status endpoint, and verifies the resulting access before reporting success.
9. Mirante retrieves the final dataset representation, then OpenLayers requests WMS tiles through the configured GeoNode route.

No custom GeoNode endpoint, model, setting, or plugin is required.

## Validation and limits

- The client accepts one `.geojson`, `.kml`, or `.zip` file up to the configured
  limit. The official distribution defaults to 100 MB.
- GeoJSON must contain an object with `type: "FeatureCollection"` and a `features` array.
- KML must be a well-formed XML document with a `kml` root element.
- ZIP files receive a basic archive signature check in the browser. GeoNode validates that the archive contains a usable Shapefile, including its required companion files.
- Before transfer, Mirante normalizes the outer upload filename to an ASCII-safe technical name. This avoids GeoNode storage failures caused by decomposed accents and other Unicode filename characters while preserving the file content and any user-provided title.
- Filenames inside a ZIP archive are not rewritten in the browser. Shapefile component names should use matching ASCII-safe names.
- GeoNode applies its own file type, permission, upload size, parallelism, and ingestion validation after local validation succeeds.
- Metadata and styling are entirely optional. Omitting both preserves the same importer behavior as the original upload flow.
- Visibility selection is distribution-configurable. When disabled, Mirante neither lists groups nor reads or changes resource permissions; GeoNode defaults remain authoritative.
- Basic styling currently supports polygon fill and outline colors, or circle and square point symbols with fill and outline colors.
- Line and raster style editors, attribute-based rules, classifications, labels, opacity controls, symbol sizes, and automatic geometry detection are not included yet.
- The user must choose the matching geometry style. Selecting a point style for polygon data, or the reverse, can make features invisible until the style is corrected in GeoNode.
- If metadata, styling, or permissions fail after ingestion, the dataset already exists in GeoNode and can be completed from its management interface.
- The server may enforce a lower upload limit than the client.
- The upload dialog must remain open during this initial implementation. Upload recovery after a page reload is not yet implemented.
- Published layers remain in the current Mirante session. Reloading the page does not restore them yet.

The same-origin deployment topology described in [Authentication](authentication.md) also applies to dataset ingestion and WMS requests.
