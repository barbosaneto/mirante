# ADR 0007: Maintain a reproducible Docker development stack

- Status: Accepted
- Date: 2026-08-29

## Context

Validating Mirante requires GeoNode, GeoServer, databases, workers, cache,
broker, persistent files, and browser-compatible routing. Contributors should
not have to assemble those services manually.

## Decision

Maintain a Docker Compose development environment with pinned component
versions, named volumes, health checks, explicit service dependencies, and a
same-origin development proxy. Do not force a single CPU platform in Compose;
build sources should remain usable on `linux/amd64` and `linux/arm64`.

## Consequences

- Local integration is reproducible and close to the supported GeoNode target.
- Development defaults and images are not a production baseline.
- Multi-architecture and production-image certification require separate
  automated validation.
- Destructive volume cleanup remains an explicit operator action.
