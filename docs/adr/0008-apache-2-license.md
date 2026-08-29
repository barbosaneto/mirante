# ADR 0008: License independent Mirante code under Apache 2.0

- Status: Accepted
- Date: 2026-08-29

## Context

Mirante is an independent frontend that communicates with GeoNode and
GeoServer through public web interfaces. It needs a recognized open-source
license suitable for community and institutional distributions, including an
explicit patent grant.

## Decision

License original Mirante source and documentation under the Apache License
2.0. Preserve all third-party license and attribution requirements separately.
Do not copy MapStore or other upstream source merely to accelerate development.

## Consequences

- Contributions are accepted under Apache 2.0 unless explicitly agreed
  otherwise.
- Distributions must include the license and preserve applicable notices.
- GeoNode, GeoServer, OpenLayers, container bases, dependencies, map data, and
  tile services retain their own licenses and terms.
- This decision grants no trademark rights and does not imply affiliation with
  upstream projects.
