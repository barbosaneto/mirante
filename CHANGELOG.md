# Changelog

All notable changes to Mirante will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and releases will follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Open-source project policies, templates, architecture records, licensing,
  compatibility guidance, and third-party notices.
- A multi-stage, non-root production image with validated runtime configuration,
  an explicit GeoNode reverse proxy, healthcheck, frontend-only and complete
  vanilla GeoNode production Compose examples, a typed environment reference,
  and operational deployment guidance.
- GitHub Actions quality gates and SemVer-triggered GHCR publication of AMD64
  and ARM64 images with SBOM and build-provenance attestations.

### Changed

- Attribute tables now load and append additional feature pages automatically
  as the user reaches the end of the scrollable table.
- Dialog close controls now use consistently centered vector icons.

[Unreleased]: https://github.com/barbosaneto/mirante/commits/main
