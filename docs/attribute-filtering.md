# Attribute filtering

The attribute table provides a typed filter builder for active vector datasets. A filter belongs to its dataset layer and remains active if the table is closed and reopened.

## Supported filters

Mirante infers field types from the attributes returned by GeoServer:

- Text fields support contains, equals, and does-not-equal comparisons.
- Number fields support equality and ordered comparisons.
- Date fields support equality and ordered comparisons through a native date input.

Only one filter expression is active per layer in the current increment. Applying another expression replaces the previous one. Clearing the filter restores the complete WFS result and the unfiltered WMS visualization.

## GeoServer integration

The structured filter is serialized as escaped CQL and sent to both services:

- WFS `GetFeature` receives `cql_filter`, so pagination and the attribute rows represent only matching features.
- The active OpenLayers WMS source receives the same expression through `CQL_FILTER`, so the map and table stay consistent.

Field identifiers and text literals are escaped before serialization. Numeric values must be finite numbers and dates must use `YYYY-MM-DD`. The implementation uses only standard GeoServer capabilities exposed by a vanilla GeoNode deployment.

## Current limits

- A layer supports one active condition at a time.
- Compound `AND` and `OR` groups are not yet available.
- Field types are inferred from the first loaded attribute page rather than a separate WFS schema request.
- Filters are kept for the current application session and are not yet written to saved GeoNode maps.
