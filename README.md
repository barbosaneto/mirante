# Mirante

Mirante is an experimental, extensible, open-source Web GIS client designed to work with GeoNode.

Current release: `0.1.1`.

Try the public Mirante instance at [mirantegeo.org](https://mirantegeo.org).

> Mirante is an independent community project. It is not an official GeoNode product and is not affiliated with or endorsed by GeoNode, OSGeo, or GeoSolutions.

> [!WARNING]
> Mirante is pre-release software. Public contracts, deployment guidance, and
> compatibility may change before version 1.0. Do not treat the development
> Compose stack as a production security baseline.

## Documentation

- [Architecture](docs/architecture.md)
- [Compatibility](docs/compatibility.md)
- [Configuration](docs/configuration.md)
- [Environment reference](docs/environment.md)
- [Extensions](docs/extensions.md)
- [Internationalization](docs/internationalization.md)
- [Security architecture](docs/security.md)
- [Production deployment](docs/deployment.md)
- [Continuous integration and container publication](docs/continuous-integration.md)
- [Architecture decisions](docs/adr/README.md)
- [Contributing](CONTRIBUTING.md)

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

Mirante currently targets GeoNode 5.1.0. Other versions are not certified; see
[Compatibility](docs/compatibility.md). The local Docker environment includes
GeoNode, GeoServer, PostgreSQL/PostGIS, Celery, Redis, and an Nginx reverse
proxy.

```bash
cp .env.example .env
docker compose up --build -d --wait
```

That command uses the official GeoNode, GeoServer, PostGIS, Redis, Memcached,
and GeoNode Nginx images directly on AMD64. Because the GeoNode project does
not publish ARM64 variants for four of those services, ARM64 development uses
the supplied compatibility override:

```bash
docker compose -f compose.yml -f compose.arm64.yml up --build -d --wait
```

Mirante is then available at `http://localhost:5173`, and GeoNode remains directly available at `http://localhost:8000`. Requests from Mirante to `/api`, `/geoserver`, and the other reserved GeoNode paths are proxied through the internal Docker network.

Source files are mounted into the Mirante container and update through Vite hot reload. The development entrypoint synchronizes the dependency volume when `package-lock.json` changes.

## Production image

The multi-stage frontend image builds static assets and serves them through an
unprivileged Nginx process. Runtime environment settings select GeoNode origins,
authentication behavior, upload visibility, and upload limits without rebuilding
the image. The separate `compose.production.yml` is a hardened frontend example;
it does not claim to make the development GeoNode stack production-ready.

Both AMD64 and ARM64 hosts can pull the public immutable image without registry
authentication:

```bash
docker pull ghcr.io/barbosaneto/mirante:0.1.1
```

The complete production release requires no repository clone or server-side
build. Download `compose.yml`, `compose.arm64.yml`, `mirante.env.example`,
`validate-environment.sh`, and `SHA256SUMS` from the
[latest release](https://github.com/barbosaneto/mirante/releases/latest), then
follow the [production deployment guide](docs/deployment.md). AMD64 consumes
the upstream official images directly. ARM64 applies the additional Compose
file only for GeoNode components that have no official ARM64 image.

See [Production deployment](docs/deployment.md) for build, reverse-proxy,
full-stack startup, configuration, healthcheck, backup, update, and rollback
guidance. Every supported production variable, type, requirement, and supplied
default is listed in the [environment reference](docs/environment.md).
Release tags publish verified `linux/amd64` and `linux/arm64` images to GitHub
Container Registry without accessing an operator's deployment server. See
[Continuous integration and container publication](docs/continuous-integration.md).

## Quality checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run security:audit
```

See [Security](docs/security.md) for the trust model, audit result, deployment
requirements, and residual risks.

## Customization

The official distribution keeps branding, the complete semantic color theme,
GeoNode URLs, map defaults, base-map sources, locales, and feature availability
in a single public configuration. See
[Configuration](docs/configuration.md) for the supported contract.

Mirante extensions are installed at build time and use only the root exports
from `@mirante/sdk`. They can register toolbar actions, custom icons, translated
panels, and React components. The official distribution includes an executable
view-presets extension outside the core. See [Extensions](docs/extensions.md) and
[Internationalization](docs/internationalization.md).

Authentication uses GeoNode's standard Django session, CSRF protection, and API V2 user resource without requiring a custom backend. A distribution can require authentication before loading the client and register GeoNode social-login providers through the extension API. See [Authentication](docs/authentication.md) and [Authorization](docs/authorization.md) for the request flow, capability model, and deployment requirements.

Users with GeoNode's resource creation permission can upload GeoJSON, KML, and zipped Shapefiles through its standard asynchronous importer. Optional title, description, polygon styling, point styling, and configurable public, private, or group visibility use vanilla GeoNode metadata, SLD, group, and resource-permission workflows. The visibility feature can be disabled so GeoNode's upload defaults remain untouched. Mirante follows the execution, retrieves the published dataset, adds its WMS layer to OpenLayers, and exposes visibility and opacity controls. See [Dataset ingestion](docs/dataset-ingestion.md) and [Upload permissions](docs/upload-permissions.md) for the supported flow and authorization contract.

The collapsed dataset catalogue lists published resources visible through GeoNode API V2. Users can add them to the map, remove active layers without deleting server resources, and open GeoNode's full catalogue for advanced management. See [Dataset catalogue](docs/dataset-catalogue.md).

Active layers can be fitted back into view from the layer panel. Clicking the map queries visible dataset layers through standard WMS GetFeatureInfo and presents returned attributes without requiring a custom backend. See [Feature inspection](docs/feature-inspection.md).

Each active vector dataset also provides an infinitely scrolling attribute table backed by standard GeoServer WFS. Users can inspect dynamic columns, select and persistently highlight an individual feature, apply typed attribute filters synchronized with the WMS visualization, and export every matching feature as CSV or GeoJSON. Filters are preserved in Mirante map resources. See [Attribute table](docs/attribute-table.md), [Attribute filtering](docs/attribute-filtering.md), and [Map persistence](docs/map-persistence.md).

The bottom toolbar lists the base maps registered by the distribution; the
official configuration provides dark CARTO and light OpenStreetMap layers. The
active dataset panel remains dedicated to WMS overlays. See
[Base maps](docs/base-maps.md).

Authenticated users can search and paginate accessible GeoNode maps, restore
their geographic view, base map, filters and dataset layer state, save new maps,
and update an opened map subject to GeoNode permissions. See
[Map persistence](docs/map-persistence.md).

## Workspace structure

- `apps/mirante`: official Mirante distribution and application entry point.
- `packages/core`: application composition and lifecycle.
- `packages/sdk`: public extension contracts.
- `packages/geonode`: GeoNode integration and model mapping.
- `packages/map`: map implementation behind a public facade.
- `packages/ui`: shared UI primitives and theme tokens.
- `packages/i18n`: internationalization initialization and locale contracts.

The package boundaries and dependency rules are described in
[Architecture](docs/architecture.md).

## Contributing and support

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Public
bug reports and focused feature proposals use the repository issue templates.
Use [SECURITY.md](SECURITY.md) for private vulnerability reporting and
[SUPPORT.md](SUPPORT.md) for support boundaries. Community participation is
governed by [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

Notable changes are recorded in [CHANGELOG.md](CHANGELOG.md). Versioning and
release preparation follow [the release policy](docs/releasing.md).

## License

Mirante's original source and documentation are licensed under the
[Apache License 2.0](LICENSE). See [NOTICE](NOTICE),
[third-party notices](THIRD_PARTY_NOTICES.md), and
[ADR 0008](docs/adr/0008-apache-2-license.md) for attribution and scope.
