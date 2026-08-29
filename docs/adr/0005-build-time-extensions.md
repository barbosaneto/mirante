# ADR 0005: Support build-time extensions, not remote plugins

- Status: Accepted
- Date: 2026-08-29

## Context

Institutions need simple customization while retaining core updates. Loading
arbitrary remote code would add trust, compatibility, caching, deployment, and
failure-recovery problems before the public extension contract is mature.

## Decision

Extensions are trusted TypeScript modules installed and bundled by a
distribution. They register supported behavior through `@mirante/sdk` root
exports. Remote plugins, marketplaces, Module Federation, and arbitrary runtime
code loading are out of scope.

## Consequences

- Extensions share the application's browser privileges and must be reviewed.
- Builds remain deterministic and statically analyzable.
- The SDK stays deliberately small and grows only for demonstrated use cases.
- A future remote-plugin proposal must supersede this record and define a
  security and compatibility model.
