# Mirante

Mirante is an experimental, extensible, open-source Web GIS client designed to work with GeoNode.

> Mirante is an independent community project. It is not an official GeoNode product and is not affiliated with or endorsed by GeoNode, OSGeo, or GeoSolutions.

## Current status

This repository currently contains the initial workspace foundation. GeoNode integration, the OpenLayers map, authentication, dataset upload, extension APIs, and the final interface will be added incrementally.

## Requirements

- Node.js 18.18 or newer
- npm 10

## Development

```bash
npm install
npm run dev
```

The development server is available at `http://localhost:5173` by default.

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
