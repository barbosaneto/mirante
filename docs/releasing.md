# Release policy

Mirante uses Semantic Versioning and a Keep a Changelog-style changelog. This
document defines policy; automated packaging and publication will be added in a
later increment.

## Versions

- `0.MINOR.PATCH` identifies experimental releases before the public contracts
  are stable.
- A `0.MINOR` release may include incompatible public SDK or configuration
  changes, which must be documented prominently.
- A `0.PATCH` release contains compatible fixes and documentation improvements.
- `1.0.0` will mark the first stable public contract and supported deployment
  baseline.
- After `1.0.0`, incompatible public changes require a major version.

The version covers Mirante, not GeoNode. Supported GeoNode combinations are
listed separately in [Compatibility](compatibility.md).

## Changelog

Every user-visible, operational, compatibility, security, or public contract
change belongs under `Unreleased` in `CHANGELOG.md`. Use the headings `Added`,
`Changed`, `Deprecated`, `Removed`, `Fixed`, and `Security` as needed. Internal
changes with no effect on users or contributors do not require an entry.

At release time, maintainers will:

1. Confirm the planned scope and supported compatibility matrix.
2. Run all required automated and real-integration checks.
3. Resolve or explicitly document security and licensing findings.
4. Replace `Unreleased` entries with the version and release date.
5. Update package and artifact versions consistently.
6. Create a signed or otherwise verifiable Git tag named `vX.Y.Z`.
7. Publish release notes derived from the changelog.
8. Publish only artifacts produced from that tag.
9. Restore an empty `Unreleased` section.

Pre-releases use SemVer identifiers such as `0.1.0-alpha.1` and must not be
presented as stable or production-ready.

## Deprecation

When practical, public SDK and configuration changes should provide a
documented transition period. During `0.x`, a deprecation may be removed in the
next minor release. After `1.0.0`, removal waits for the next major release.

Security fixes may shorten this period when retaining old behavior would leave
users exposed.
