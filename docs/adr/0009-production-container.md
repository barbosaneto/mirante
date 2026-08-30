# ADR 0009: Distribute a runtime-configurable production container

- Status: Accepted
- Date: 2026-08-29

## Context

The development container runs Vite with source mounts and cannot be promoted
as an immutable deployment artifact. Institutional operators need to deploy the
same Mirante build beside an unmodified GeoNode without adopting a particular
hosting platform or rebuilding the frontend for each environment.

## Decision

Build the official application in a multi-stage Dockerfile and serve the static
output with an unprivileged Nginx process. Generate a validated public runtime
configuration when the container starts, and proxy an explicit set of GeoNode
routes to an operator-supplied HTTP(S) origin.

Keep the production image independent from the development GeoNode stack.
Provide both a hardened frontend-only Compose and a complete production
topology using pinned vanilla GeoNode services. The complete topology uses one
public origin, exposes only the Mirante frontend to a host TLS edge, and keeps
stateful services on an internal Docker network. Do not encode institutional
TLS certificates, secrets, backup destinations, or deployment automation in the
official distribution.

## Consequences

- One image can be promoted between environments by changing runtime settings.
- Browser requests can retain a same-origin integration boundary.
- The image remains useful with vanilla GeoNode and external orchestration.
- Operators can start the complete supported stack from a documented private
  environment without adapting the development Compose.
- Build-time extensions, branding, locales, base maps, and theme contracts
  still require a distribution build.
- Operators remain responsible for public TLS, secret management, backups,
  resource sizing, monitoring, and policy choices.
- Multi-architecture publication and certification remain release-pipeline
  work.
