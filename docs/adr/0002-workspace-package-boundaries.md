# ADR 0002: Use explicit workspace package boundaries

- Status: Accepted
- Date: 2026-08-29

## Context

Institutional distributions need to customize Mirante without modifying its
internal implementation. GeoNode and OpenLayers details must not spread across
the application.

## Decision

Use npm workspaces with an official application and focused packages for core
composition, public SDK contracts, GeoNode integration, map implementation,
shared UI, and internationalization. Consumers use package root exports only.

## Consequences

- Upstream payload conversion stays in `packages/geonode`.
- OpenLayers stays behind `packages/map`.
- Institutional code can depend on stable entry points rather than copying
  core files.
- New packages require a concrete responsibility that does not fit an existing
  boundary.
