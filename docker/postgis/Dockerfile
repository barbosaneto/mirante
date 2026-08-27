# syntax=docker/dockerfile:1.7

FROM postgres:15-bookworm

RUN apt-get update \
    && apt-get install --yes --no-install-recommends \
        ca-certificates \
        curl \
        postgis \
        postgresql-15-postgis-3 \
    && curl --fail --location --silent --show-error \
        https://raw.githubusercontent.com/GeoNode/geonode-docker/cd47f0e18342631b76bd2056867133a3d6798930/docker/postgis/initdb-geonode.sh \
        --output /docker-entrypoint-initdb.d/geonode.sh \
    && chmod +x /docker-entrypoint-initdb.d/geonode.sh \
    && apt-get purge --yes --auto-remove curl \
    && rm -rf /var/lib/apt/lists/*
