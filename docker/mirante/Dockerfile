# syntax=docker/dockerfile:1.7

ARG NGINX_VERSION=1.31.2

FROM node:22.18.0-bookworm-slim AS workspace-dependencies

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/mirante/package.json apps/mirante/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/geonode/package.json packages/geonode/package.json
COPY packages/i18n/package.json packages/i18n/package.json
COPY packages/map/package.json packages/map/package.json
COPY packages/sdk/package.json packages/sdk/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN npm ci

FROM workspace-dependencies AS development

COPY . .
COPY docker/mirante/entrypoint.sh /usr/local/bin/mirante-entrypoint

RUN cp package-lock.json node_modules/.mirante-package-lock.json \
  && chmod +x /usr/local/bin/mirante-entrypoint

EXPOSE 5173

ENTRYPOINT ["mirante-entrypoint"]
CMD ["npm", "run", "dev"]

FROM workspace-dependencies AS build

COPY . .

RUN npm run build

FROM nginx:${NGINX_VERSION}-alpine AS production

ARG MIRANTE_VERSION=0.0.0-dev

LABEL org.opencontainers.image.title="Mirante" \
  org.opencontainers.image.description="Extensible Web GIS client for GeoNode" \
  org.opencontainers.image.licenses="Apache-2.0" \
  org.opencontainers.image.source="https://github.com/barbosaneto/mirante" \
  org.opencontainers.image.version="${MIRANTE_VERSION}"

ENV MIRANTE_VERSION=${MIRANTE_VERSION}

COPY docker/mirante/nginx.conf /etc/nginx/nginx.conf
COPY docker/mirante/default.conf.template /etc/nginx/templates/mirante.conf.template
COPY docker/mirante/production-entrypoint.sh /usr/local/bin/mirante-production-entrypoint
COPY --from=build --chown=nginx:nginx /workspace/apps/mirante/dist /usr/share/nginx/html

RUN chmod 0555 /usr/local/bin/mirante-production-entrypoint

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --output-document=/dev/null http://127.0.0.1:8080/healthz || exit 1

ENTRYPOINT ["mirante-production-entrypoint"]
CMD ["nginx", "-g", "daemon off;"]
