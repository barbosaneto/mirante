# Mirante

Mirante is an experimental, extensible, open-source Web GIS client designed to work with GeoNode.

> Mirante is an independent community project. It is not an official GeoNode product and is not affiliated with or endorsed by GeoNode, OSGeo, or GeoSolutions.

## Current status

This repository currently contains the initial workspace, a containerized local development stack, a minimal OpenLayers map, and the first responsive application shell. Authentication, dataset upload, extension APIs, and functional map tools will be added incrementally.

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

When running outside Docker, the development proxy forwards GeoNode routes to `http://localhost:8000`. Set `GEONODE_INTERNAL_URL` to use another target.

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
