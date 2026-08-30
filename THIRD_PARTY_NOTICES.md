# Third-party notices

Mirante is licensed under the Apache License 2.0. That license does not replace
the licenses of third-party software, container images, services, map data, or
tiles used with the project.

This file summarizes the principal runtime components referenced directly by
the repository. It is not a substitute for the complete license metadata in
`package-lock.json`, operating-system packages, or upstream distributions.

## Frontend runtime

| Component                                                 | Purpose                             | License      |
| --------------------------------------------------------- | ----------------------------------- | ------------ |
| [React](https://github.com/facebook/react)                | User interface runtime              | MIT          |
| [i18next](https://github.com/i18next/i18next)             | Internationalization runtime        | MIT          |
| [react-i18next](https://github.com/i18next/react-i18next) | React internationalization bindings | MIT          |
| [OpenLayers](https://github.com/openlayers/openlayers)    | Web map rendering                   | BSD-2-Clause |

The build and test toolchain also includes packages under permissive licenses.
Exact resolved versions are recorded in `package-lock.json`; package license
texts remain available from their respective distributions.

## Local GeoNode stack

The Docker Compose development environment obtains and runs independent
upstream software. These components are not relicensed under Mirante's Apache
2.0 license.

| Component                                                                                                 | Version or source                                                           | License                                   |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------- |
| [GeoNode](https://github.com/GeoNode/geonode/tree/5.1.0)                                                  | Official 5.1.0 AMD64 image; source-built ARM64 compatibility image          | GPL-2.0-or-later                          |
| [GeoServer](https://github.com/geoserver/geoserver)                                                       | Official GeoNode 2.28.4 AMD64 image; source-built ARM64 compatibility image | GPL-2.0-or-later with upstream exceptions |
| [GeoNode Docker](https://github.com/GeoNode/geonode-docker/tree/cd47f0e18342631b76bd2056867133a3d6798930) | Official images and pinned ARM64 build sources                              | GPL-2.0-or-later                          |
| [PostgreSQL](https://www.postgresql.org/)                                                                 | GeoNode PostGIS image with PostgreSQL 15                                    | PostgreSQL License                        |
| [PostGIS](https://postgis.net/)                                                                           | GeoNode PostGIS 15-3.5 image                                                | GPL-2.0-or-later                          |
| [Redis](https://redis.io/)                                                                                | Official `redis:7-alpine` image                                             | See bundled license metadata              |
| [Memcached](https://memcached.org/)                                                                       | Official `memcached:1.6-alpine` image                                       | BSD-3-Clause                              |
| [Ubuntu](https://ubuntu.com/)                                                                             | 24.04 base for ARM64 compatibility images                                   | Multiple licenses                         |
| [Node.js](https://nodejs.org/)                                                                            | 22.18.0 Bookworm development image                                          | MIT and bundled third-party licenses      |

Redis licensing varies by upstream version, so distributors must inspect the
exact official image and bundled package metadata selected by the Compose tag.

## Map services and data

The official distribution can request tiles from OpenStreetMap and CARTO.
Their data, tiles, names, and services are governed by their own licenses,
usage policies, and attribution requirements. Mirante renders the configured
attribution on the map. A distribution that changes a base map is responsible
for supplying the correct attribution and complying with the provider's terms.

## Distribution responsibility

Before redistributing a built frontend or container images:

1. Generate an inventory from the exact lockfile and image digests being
   shipped.
2. Preserve upstream license and notice files.
3. Review copyleft obligations for software included in container images.
4. Preserve map-data and tile-provider attribution.
5. Update this file when direct runtime components change.

No trademark rights are granted by this notice.
