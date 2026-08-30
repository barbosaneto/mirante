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
same-origin development proxy. The base Compose consumes official upstream
images directly on AMD64. Because GeoNode does not publish four required ARM64
images, provide an explicit ARM64 override that selects narrowly scoped native
compatibility builds for those services. Do not emulate AMD64 on ARM64.

## Consequences

- Local integration is reproducible and close to the supported GeoNode target.
- Redis and Memcached remain official upstream images on both architectures.
- A GeoNode component leaves the compatibility override when upstream publishes
  a suitable native ARM64 image.
- Development defaults and images are not a production baseline.
- Multi-architecture and production-image certification require separate
  automated validation.
- Destructive volume cleanup remains an explicit operator action.
