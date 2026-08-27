# syntax=docker/dockerfile:1.7

FROM ubuntu:24.04

RUN apt-get update \
    && apt-get install --yes --no-install-recommends memcached netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

USER memcache

EXPOSE 11211

ENTRYPOINT ["memcached"]
