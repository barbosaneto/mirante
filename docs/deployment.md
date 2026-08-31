# Production deployment

Mirante is distributed as a static application served by an unprivileged Nginx
process. The container also proxies the GeoNode routes used by the browser so a
deployment can preserve same-origin session and CSRF behavior without modifying
GeoNode.

The production image contains only Mirante. The repository provides two
production examples:

- `compose.production.yml` deploys only Mirante beside an existing GeoNode.
- `compose.stack.production.yml` deploys Mirante and the complete pinned vanilla
  GeoNode stack.

The root `compose.yml` remains a development environment and must not be treated
as the production baseline.

## Complete stack on one public domain

The full-stack example runs Mirante, GeoNode, GeoServer, Celery, PostgreSQL,
Redis, Memcached, and the GeoNode Nginx proxy. Only Mirante binds a host port,
at `127.0.0.1:8080` by default. Mirante owns `/` and forwards GeoNode API,
authentication, administration, catalogue, profile, static, media, WMS, WFS,
and management paths over the internal Docker network.

This single-origin topology keeps Django sessions and CSRF requests on the same
browser origin. GeoNode and GeoServer remain unmodified upstream services.

### 1. Prepare the host and domain

Install a supported Docker Engine and Docker Compose v2. Point the public DNS
record, such as `mirantegeo.org`, to the server. Configure a maintained host
edge proxy to:

1. Terminate HTTPS for the public domain.
2. Forward requests to `http://127.0.0.1:8080`.
3. Replace untrusted forwarded headers.
4. Send `X-Forwarded-Proto: https` and `X-Forwarded-Port: 443`.

Expose only the edge's ports 80 and 443 through the host firewall. PostgreSQL,
Redis, Memcached, GeoServer, Django, and the internal GeoNode Nginx have no host
port in the production Compose.

For example, a host-installed Caddy can manage the certificate and forwarded
headers with this minimal site block:

```caddyfile
mirantegeo.org {
  reverse_proxy 127.0.0.1:8080
}
```

Replace the hostname when using another domain. Keep Caddy's data directory
persistent so certificates and account state survive restarts.

### 2. Download the release bundle

```bash
mkdir mirante-deployment
cd mirante-deployment
curl --fail --location --remote-name https://github.com/barbosaneto/mirante/releases/download/v0.1.1/compose.yml
curl --fail --location --remote-name https://github.com/barbosaneto/mirante/releases/download/v0.1.1/compose.arm64.yml
curl --fail --location --remote-name https://github.com/barbosaneto/mirante/releases/download/v0.1.1/mirante.env.example
curl --fail --location --remote-name https://github.com/barbosaneto/mirante/releases/download/v0.1.1/validate-environment.sh
curl --fail --location --remote-name https://github.com/barbosaneto/mirante/releases/download/v0.1.1/SHA256SUMS
sha256sum --check SHA256SUMS
```

AMD64 requires only `compose.yml` and the resulting `.env` to keep the
deployment running. ARM64 additionally requires `compose.arm64.yml`. The
validator and checksums are recommended preflight tools. Neither Compose file
contains a build context or source path.

The base Compose consumes official upstream images directly. The GeoNode
project currently publishes its GeoNode, Nginx, GeoServer, and PostGIS images
only for AMD64. The ARM64 override replaces exactly those four components with
native compatibility images; official Redis and Memcached images are used on
both architectures. Confirm the host architecture with `uname -m`: `x86_64`
uses only the base file, while `aarch64` or `arm64` also uses the override.

### 3. Create the private environment

```bash
cp mirante.env.example .env
chmod 600 .env
```

Replace the domain, administrator email, and every `replace-with-*` value.
Generate independent URL-safe secrets, for example with
`openssl rand -hex 32`. Database passwords occur both as individual variables
and inside connection URLs; keep each repeated value synchronized.

Review anonymous permissions and account registration deliberately. The example
allows public dataset downloads and disables open signup. It does not impose a
private-data policy on every deployment.

Before startup, this command must produce no output:

```bash
grep -n 'replace-with-' .env
```

Validate the resolved Compose without printing it into logs shared with other
people. The supplied preflight performs both checks, validates critical
same-origin relationships and security values, and validates the Compose:

```bash
sh ./validate-environment.sh .env compose.yml
```

On ARM64, validate both files:

```bash
sh ./validate-environment.sh .env compose.yml compose.arm64.yml
```

All supported settings, types, requirements, defaults, and first-start behavior
are listed in the [environment reference](environment.md).

### 4. Start the complete stack

The first initialization includes database migrations, GeoServer preparation,
static assets, and the initial administrator, so it can take several minutes.

```bash
docker compose --env-file .env -f compose.yml pull
docker compose --env-file .env -f compose.yml up -d --wait --wait-timeout 900
```

On ARM64:

```bash
docker compose --env-file .env -f compose.yml -f compose.arm64.yml pull
docker compose --env-file .env -f compose.yml -f compose.arm64.yml up -d --wait --wait-timeout 900
```

Inspect status and bounded logs with:

```bash
docker compose --env-file .env -f compose.yml ps
docker compose --env-file .env -f compose.yml logs --tail 100 django geoserver celery
curl --fail http://127.0.0.1:8080/healthz
```

ARM64 operators must include `-f compose.arm64.yml` in the status and log
commands as well.

The public domain should then load Mirante. Account, admin, catalogue, profile,
dataset, map, WMS, and WFS routes remain on that same domain and are served by
the vanilla GeoNode stack behind Mirante.

GeoServer administration is available at `/geoserver/web/`. The bare
`/geoserver/` path is also used by GeoWebCache and service endpoints and must
not be used as the administration link.

### 5. Stop without deleting data

```bash
docker compose --env-file .env -f compose.yml stop
```

On ARM64, include `-f compose.arm64.yml` before `stop`.

Do not add `--volumes` to `docker compose down` unless permanent removal of all
databases, datasets, uploaded media, GeoServer state, and backups is intended.

## Frontend-only deployment

When GeoNode is already operated separately, copy
`deploy/production.example.env` to a private path outside the repository, then
set the real GeoNode origins and deployment values. Pull and start only the
Mirante container with:

```bash
docker compose \
  --env-file /private/path/mirante.env \
  -f compose.production.yml \
  pull
docker compose \
  --env-file /private/path/mirante.env \
  -f compose.production.yml \
  up -d --wait
```

The example binds Mirante to `127.0.0.1:8080`. Terminate HTTPS with a maintained
edge proxy on the host and forward the public application origin to that port.
Change the binding deliberately when the edge proxy runs on another host or
container network. The edge must replace untrusted forwarded headers and send
the original public protocol and port through `X-Forwarded-Proto` and
`X-Forwarded-Port`; Mirante preserves those values when proxying GeoNode.

## Frontend runtime settings

The production entrypoint validates settings and writes a small, non-cached
browser configuration before starting Nginx. The same image can therefore be
promoted between environments without rebuilding it.

| Variable                                     | Default     | Purpose                                                                 |
| -------------------------------------------- | ----------- | ----------------------------------------------------------------------- |
| `GEONODE_INTERNAL_URL`                       | Required    | Private HTTP(S) GeoNode origin reached by Nginx; paths are not accepted |
| `MIRANTE_GEONODE_BASE_URL`                   | `/`         | Browser API base; `/` uses the same-origin proxy                        |
| `MIRANTE_GEONODE_WEB_URL`                    | Required    | Public GeoNode origin used for complete management pages                |
| `MIRANTE_REQUIRE_AUTHENTICATION`             | `false`     | Require a GeoNode session before loading the client                     |
| `MIRANTE_DATASET_UPLOAD_VISIBILITY_CONTROL`  | `true`      | Offer public, private, and group visibility during upload               |
| `MIRANTE_DATASET_UPLOAD_MAX_FILE_SIZE_BYTES` | `104857600` | Client-side file limit in bytes                                         |
| `MIRANTE_PROXY_MAX_BODY_SIZE`                | `110m`      | Nginx request limit, including multipart overhead                       |

The proxy limit, GeoNode upload limit, upstream edge limit, and frontend file
limit must be coordinated. The lowest limit remains authoritative.

## GeoNode configuration

Mirante targets an unmodified GeoNode. Configure GeoNode's allowed hosts, site
URL, CSRF trusted origins, secure cookies, and proxy headers for the public
topology. If Mirante and the full GeoNode interface use separate subdomains,
review Django session and CSRF cookie domains deliberately; do not compensate
with permissive CORS.

The production proxy forwards only the explicit browser integration routes.
`MIRANTE_GEONODE_WEB_URL` sends users to GeoNode's own public origin for profile,
administration, catalogue, and other complete management pages.

## Health and operation

### GeoServer authentication during imports

Dataset publication uses `GEOSERVER_ADMIN_USER` and
`GEOSERVER_ADMIN_PASSWORD` for server-to-server GeoServer REST calls. Verify
that the credential loaded by Django matches the password stored in GeoServer
without printing the secret:

```bash
docker compose --env-file .env -f compose.yml exec -T django sh -lc \
  'curl --silent --output /dev/null --write-out "%{http_code}\n" \
  --user "$GEOSERVER_ADMIN_USER:$GEOSERVER_ADMIN_PASSWORD" \
  "${GEOSERVER_LOCATION%/}/rest/about/version.json"'
```

ARM64 deployments must add `-f compose.arm64.yml`. A `200` response confirms
the REST credential; `401` means the environment and persistent GeoServer
password differ. Change the password through `/geoserver/web/`, copy that same
value to `.env`, and then reload every consumer:

```bash
docker compose --env-file .env -f compose.yml up -d --force-recreate \
  django celery geoserver
```

Do not remove the GeoServer volume to rotate a password: it also contains the
published workspaces, stores, layers, styles, and security configuration.

The supplied Compose starts `celery-cmd` directly after Django becomes healthy.
Django remains responsible for migrations, fixtures, static assets, and the
vanilla GeoNode initialization. This avoids an upstream entrypoint timing issue
where `.override_env` can be rewritten after a long-lived Celery worker starts,
causing that worker to retain an older GeoServer credential until it is
recreated.

`GET /healthz` returns `200` when the static server is running. This does not
assert GeoNode, GeoServer, database, or storage health. Monitor those services
independently.

The container runs as the image's unprivileged `nginx` user, drops Linux
capabilities in the example Compose, uses a read-only root filesystem, and
writes generated configuration and Nginx temporary data only to `/tmp`.

## Backup

The full stack persists PostgreSQL, GeoServer configuration, uploads, assets,
static content, Redis state, and application backup files in named volumes. A
production backup must leave the server and include at least:

- A consistent PostgreSQL logical dump or storage snapshot.
- Uploaded media and assets.
- GeoServer data.
- The private environment file through a secrets-safe backup process.

The presence of `database-backups` and `backup-data` volumes does not schedule
backups automatically. Define retention, encryption, off-host transfer, and a
tested restore procedure before accepting irreplaceable datasets.

## Update and rollback

Once release images are published, set `MIRANTE_IMAGE` and a fixed
`MIRANTE_VERSION` in the private deployment environment. Never depend on a
floating tag for production. Official release images are published for AMD64
and ARM64 at `ghcr.io/barbosaneto/mirante` and can be pulled anonymously after
the package's one-time public visibility setting described in
[Continuous integration and container publication](continuous-integration.md).
No registry login is required on the server. Update only the Mirante service
with:

```bash
docker compose --env-file /private/path/mirante.env -f compose.production.yml pull mirante
docker compose --env-file /private/path/mirante.env -f compose.production.yml up -d mirante
```

For rollback, restore the previous version tag and run the same commands. A
Mirante container has no application data to migrate; compatibility or GeoNode
configuration changes described in the release notes may still require
operator action.

Before updating the complete stack, take a verified backup and read the release
notes for both Mirante and GeoNode. Updating only Mirante does not require
recreating the other services:

```bash
docker compose --env-file .env -f compose.yml pull mirante
docker compose --env-file .env -f compose.yml up -d --no-deps mirante
```

On ARM64, keep `-f compose.arm64.yml` in both commands. It does not replace the
Mirante service, but it preserves the deployment's complete resolved topology.

Do not change the pinned GeoNode, GeoServer, PostgreSQL, Redis, Memcached, or
internal Nginx tags as part of a Mirante-only update. A release that changes a
stack component will include explicit migration and full-stack update guidance.

## Updating the upstream stack

The image repositories and versions are centralized in `.env`. On AMD64, a
compatible GeoNode upgrade can therefore select new official tags without
editing Compose. It still requires a backup, release-note review, migration
assessment, and integration test; changing a tag alone is not a compatibility
guarantee.

An ARM64 deployment may select a new version only after the corresponding
compatibility tags have been published by a Mirante release. This limitation is
removed automatically for any component once its upstream project publishes a
native ARM64 image; its ARM override can then be retired.
