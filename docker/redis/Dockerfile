# syntax=docker/dockerfile:1.7

FROM ubuntu:24.04

RUN apt-get update \
    && apt-get install --yes --no-install-recommends gosu redis-server \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /data \
    && chown redis:redis /data

COPY docker/redis/entrypoint.sh /usr/local/bin/redis-entrypoint

RUN chmod +x /usr/local/bin/redis-entrypoint

WORKDIR /data

EXPOSE 6379

ENTRYPOINT ["redis-entrypoint"]
CMD ["redis-server"]
