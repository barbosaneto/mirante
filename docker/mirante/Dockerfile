# syntax=docker/dockerfile:1.7

FROM node:22.18.0-bookworm-slim

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

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
