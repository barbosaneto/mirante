# syntax=docker/dockerfile:1.7

FROM ubuntu:24.04

ARG GEONODE_VERSION=5.1.0

RUN apt-get update \
    && apt-get install --yes --no-install-recommends \
        build-essential \
        ca-certificates \
        cron \
        curl \
        gcc \
        gdal-bin \
        gettext \
        geoip-bin \
        gnupg2 \
        libffi-dev \
        libgdal-dev \
        libjpeg-dev \
        libldap2-dev \
        libmagic1t64 \
        libmemcached-dev \
        libpq-dev \
        libsasl2-dev \
        libxml2 \
        libxml2-dev \
        libxslt1-dev \
        lsb-release \
        python-is-python3 \
        python3-all-dev \
        python3-dev \
        python3-gdal \
        python3-gdbm \
        python3-ldap \
        python3-lxml \
        python3-pip \
        python3-psycopg2 \
        python3-venv \
        unzip \
        uwsgi \
        uwsgi-plugin-python3 \
        wget \
        zip \
        zlib1g-dev \
    && install -d /etc/apt/keyrings \
    && curl --fail --silent --show-error https://www.postgresql.org/media/keys/ACCC4CF8.asc \
        | gpg --dearmor --output /etc/apt/keyrings/postgresql.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/postgresql.gpg] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
        > /etc/apt/sources.list.d/postgresql.list \
    && apt-get update \
    && apt-get install --yes --no-install-recommends postgresql-client-15 \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /usr/src/venv
ENV PATH="/usr/src/venv/bin:${PATH}"

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir \
        GDAL==3.8.4 \
        invoke==2.2.0 \
        sherlock \
        uwsgi \
        wheel==0.38.1 \
    && ln -s "$(command -v invoke)" /usr/local/bin/invoke

RUN mkdir -p /usr/src/geonode \
    && curl --fail --location --silent --show-error \
        "https://github.com/GeoNode/geonode/archive/refs/tags/${GEONODE_VERSION}.tar.gz" \
        | tar --extract --gzip --strip-components=1 --directory /usr/src/geonode

WORKDIR /usr/src/geonode

RUN chmod +x \
        celery-cmd \
        celery.sh \
        entrypoint.sh \
        tasks.py \
        wait-for-databases.sh \
    && install -m 0755 wait-for-databases.sh /usr/bin/wait-for-databases \
    && install -m 0755 celery.sh /usr/bin/celery-commands \
    && install -m 0755 celery-cmd /usr/bin/celery-cmd \
    && pip install --no-cache-dir --editable . \
    && apt-get autoremove --yes --purge \
    && apt-get clean

EXPOSE 8000
