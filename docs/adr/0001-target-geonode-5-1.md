# ADR 0001: Target GeoNode 5.1.0

- Status: Accepted
- Date: 2026-08-29

## Context

GeoNode web APIs, serializers, importers, permissions, and map representations
change between releases. Claiming generic compatibility would make integration
behavior difficult to verify and support.

## Decision

Mirante targets an unmodified GeoNode 5.1.0 instance. Integration code must be
based on that release's official source or API contract and mapped inside
`packages/geonode`. Additional versions require explicit compatibility work.

## Consequences

- The development stack pins GeoNode 5.1.0.
- Compatibility claims remain narrow and testable.
- Supporting a new GeoNode line may require adapters or intentional breaking
  changes rather than scattered conditionals.
