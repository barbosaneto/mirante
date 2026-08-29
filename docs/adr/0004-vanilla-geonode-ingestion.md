# ADR 0004: Use vanilla asynchronous GeoNode ingestion

- Status: Accepted
- Date: 2026-08-29

## Context

Dataset publication, metadata, styles, permissions, storage, and GeoServer
integration are GeoNode responsibilities. A separate Mirante backend would
duplicate those responsibilities and complicate deployment.

## Decision

Use GeoNode 5.1.0's standard upload and resource APIs from the authenticated
browser session. Follow asynchronous executions, validate their responses,
retrieve the created domain resource, and use standard metadata, SLD, group,
and resource-permission workflows for optional customization.

## Consequences

- No custom GeoNode plugin or Mirante backend is required for ingestion.
- Mirante behavior follows upstream authorization and processing limits.
- Post-ingestion operations can fail after a dataset exists and must report
  that partial result honestly.
- Upstream importer changes require explicit compatibility review.
