# Mirante

Mirante is an experimental, extensible, open-source Web GIS client designed to work with GeoNode.

> Mirante is an independent community project. It is not an official GeoNode product and is not affiliated with or endorsed by GeoNode, OSGeo, or GeoSolutions.

## Current status

This repository contains the initial Mirante proof of concept: a containerized local GeoNode stack, session authentication, a browsable GeoNode dataset catalogue, GeoJSON, KML, and zipped Shapefile ingestion with asynchronous progress, published WMS visualization in OpenLayers, and persistent GeoNode maps. The responsive shell also includes runtime internationalization, public distribution configuration, and a build-time extension API.

## Requirements

- Node.js 18.18 or newer
- npm 10
- Docker Engine 24 or newer with Docker Compose v2

## Development

```bash
npm install
npm run dev
```

The development server is available at `http://localhost:5173` by default.

When running outside Docker, the development proxy forwards GeoNode routes to `http://localhost:8000`. Set `GEONODE_INTERNAL_URL` to use another target and `VITE_GEONODE_WEB_URL` to the public browser-facing GeoNode origin.

## Local GeoNode

Mirante targets GeoNode 5.1.0. The local Docker environment includes GeoNode, GeoServer, PostgreSQL/PostGIS, Celery, Redis, and an Nginx reverse proxy.

```bash
cp .env.example .env
docker compose up --build -d --wait
```

Mirante is then available at `http://localhost:5173`, and GeoNode remains directly available at `http://localhost:8000`. Requests from Mirante to `/api`, `/geoserver`, and the other reserved GeoNode paths are proxied through the internal Docker network.

Source files are mounted into the Mirante container and update through Vite hot reload. The development entrypoint synchronizes the dependency volume when `package-lock.json` changes.

## Quality checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Customization

The official distribution keeps branding, theme, GeoNode URL, map defaults, locales, and feature flags in a single public configuration. See [Configuration](docs/configuration.md) for the supported contract.

Mirante extensions are installed at build time and use only the root exports from `@mirante/sdk`. See [Extensions](docs/extensions.md) for a minimal toolbar example and [Internationalization](docs/internationalization.md) for locale behavior and translation validation.

Authentication uses GeoNode's standard Django session, CSRF protection, and API V2 user resource without requiring a custom backend. See [Authentication](docs/authentication.md) for the request flow and deployment requirements.

Users with GeoNode's resource creation permission can upload GeoJSON, KML, and zipped Shapefiles through its standard asynchronous importer. Optional title, description, polygon styling, and point styling use vanilla GeoNode metadata and SLD workflows. Mirante follows the execution, retrieves the published dataset, adds its WMS layer to OpenLayers, and exposes visibility and opacity controls. See [Dataset ingestion](docs/dataset-ingestion.md) and [Upload permissions](docs/upload-permissions.md) for the supported flow and authorization contract.

The collapsed dataset catalogue lists published resources visible through GeoNode API V2. Users can add them to the map, remove active layers without deleting server resources, and open GeoNode's full catalogue for advanced management. See [Dataset catalogue](docs/dataset-catalogue.md).

Active layers can be fitted back into view from the layer panel. Clicking the map queries visible dataset layers through standard WMS GetFeatureInfo and presents returned attributes without requiring a custom backend. See [Feature inspection](docs/feature-inspection.md).

Each active vector dataset also provides a paginated attribute table backed by standard GeoServer WFS. Users can inspect dynamic columns, select and persistently highlight an individual feature, and apply typed attribute filters synchronized with the WMS visualization without loading the complete dataset into the browser. Filters are preserved in Mirante map resources. See [Attribute table](docs/attribute-table.md), [Attribute filtering](docs/attribute-filtering.md), and [Map persistence](docs/map-persistence.md).

The bottom toolbar includes a base map selector for the dark CARTO basemap and the standard light OpenStreetMap layer. The active dataset panel remains dedicated to WMS overlays. See [Base maps](docs/base-maps.md).

Authenticated users can list accessible GeoNode maps, restore their geographic view and dataset layer state, and save new maps when their account has the standard resource creation permission. See [Map persistence](docs/map-persistence.md).

## Workspace structure

- `apps/mirante`: official Mirante distribution and application entry point.
- `packages/core`: application composition and lifecycle.
- `packages/sdk`: public extension contracts.
- `packages/geonode`: GeoNode integration and model mapping.
- `packages/map`: map implementation behind a public facade.
- `packages/ui`: shared UI primitives and theme tokens.
- `packages/i18n`: internationalization initialization and locale contracts.

## License

Mirante is intended to be released under the Apache License 2.0. The complete license file and related decision record will be added in a dedicated open-source foundation increment.
