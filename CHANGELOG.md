# Changelog

All notable changes to Mirante will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and releases will follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- GeoServer administration links now target `/geoserver/web/`, while public
  OGC and GeoWebCache traffic remains under `/geoserver/`.
- Production documentation now links to the public Mirante instance and
  explains how to diagnose and prevent GeoNode-to-GeoServer authentication
  failures during dataset publication.
- The social-login extension example now uses GeoNode 5.1.0's generic OIDC
  route and records the planned bundled Google reference extension.
- Celery now starts directly from the Compose environment after Django is
  healthy, preventing stale GeoServer credentials from causing dataset import
  failures.
- GeoServer JVM examples now preserve the separate GeoWebCache REST context,
  allowing uploaded SLD styles to be assigned to newly published layers.
- Production proxy defaults now account for GeoNode's duplicated ZIP upload
  fields, preventing valid Shapefile archives below the 100 MiB file limit
  from being rejected with HTTP 413.
- Active dataset layers can now be dragged into a new stacking order, which is
  also preserved when the map is saved.
- CARTO Dark Matter was replaced by the keyless OpenFreeMap Liberty and Dark
  vector styles, while OpenStreetMap remains the default base map.

## [0.1.1] - 2026-08-30

### Added

- Official upstream runtime images used directly by the AMD64 development and
  production stacks.
- Native ARM64 compatibility images only for the four GeoNode components that
  do not publish an official ARM64 variant.
- Versioned `compose.yml`, ARM64 override, environment template, environment
  validator, and checksums as downloadable GitHub Release assets.

### Fixed

- Complete production deployment no longer requires a source checkout or any
  image build on the target server.
- Redis and Memcached no longer use Mirante-maintained container builds.

## [0.1.0] - 2026-08-29

### Added

- Open-source project policies, templates, architecture records, licensing,
  compatibility guidance, and third-party notices.
- A multi-stage, non-root production image with validated runtime configuration,
  an explicit GeoNode reverse proxy, healthcheck, frontend-only and complete
  vanilla GeoNode production Compose examples, a typed environment reference,
  and operational deployment guidance.
- GitHub Actions quality gates and SemVer-triggered GHCR publication of AMD64
  and ARM64 images with SBOM and build-provenance attestations.
- Consistent `0.1.0` workspace versioning, validated release metadata, public
  image defaults, versioned release notes, and automated GitHub Release
  creation after artifact publication.

### Changed

- Attribute tables now load and append additional feature pages automatically
  as the user reaches the end of the scrollable table.
- Dialog close controls now use consistently centered vector icons.

[Unreleased]: https://github.com/barbosaneto/mirante/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/barbosaneto/mirante/releases/tag/v0.1.1
[0.1.0]: https://github.com/barbosaneto/mirante/releases/tag/v0.1.0
