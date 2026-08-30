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

### 2. Create the private environment

```bash
cp deploy/stack.production.example.env deploy/stack.production.env
chmod 600 deploy/stack.production.env
```

The destination is ignored by Git. Replace the domain, administrator email,
and every `replace-with-*` value. Generate independent URL-safe secrets, for
example with `openssl rand -hex 32`. Database passwords occur both as individual
variables and inside connection URLs; keep each repeated value synchronized.

Review anonymous permissions and account registration deliberately. The example
allows public dataset downloads and disables open signup. It does not impose a
private-data policy on every deployment.

Before startup, this command must produce no output:

```bash
grep -n 'replace-with-' deploy/stack.production.env
```

Validate the resolved Compose without printing it into logs shared with other
people. The supplied preflight performs both checks, validates critical
same-origin relationships and security values, and validates the Compose:

```bash
sh deploy/validate-stack-environment.sh deploy/stack.production.env
```

All supported settings, types, requirements, defaults, and first-start behavior
are listed in the [environment reference](environment.md).

### 3. Start the complete stack

The first initialization includes database migrations, GeoServer preparation,
static assets, and the initial administrator, so it can take several minutes.

```bash
docker compose \
  --env-file deploy/stack.production.env \
  -f compose.stack.production.yml \
  up --build -d --wait --wait-timeout 900
```

Inspect status and bounded logs with:

```bash
docker compose --env-file deploy/stack.production.env -f compose.stack.production.yml ps
docker compose --env-file deploy/stack.production.env -f compose.stack.production.yml logs --tail 100 django geoserver celery
curl --fail http://127.0.0.1:8080/healthz
```

The public domain should then load Mirante. Account, admin, catalogue, profile,
dataset, map, WMS, and WFS routes remain on that same domain and are served by
the vanilla GeoNode stack behind Mirante.

### 4. Stop without deleting data

```bash
docker compose \
  --env-file deploy/stack.production.env \
  -f compose.stack.production.yml \
  stop
```

Do not add `--volumes` to `docker compose down` unless permanent removal of all
databases, datasets, uploaded media, GeoServer state, and backups is intended.

## Frontend-only deployment

When GeoNode is already operated separately, copy
`deploy/production.example.env` to a private path outside the repository, then
set the real GeoNode origins and deployment values. Build and start only the
Mirante container with:

```bash
docker compose \
  --env-file /private/path/mirante.env \
  -f compose.production.yml \
  up --build -d --wait
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
and ARM64 at `ghcr.io/barbosaneto/mirante`; private packages require a prior
registry login as described in
[Continuous integration and container publication](continuous-integration.md).
Update only the Mirante service with:

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
docker compose --env-file deploy/stack.production.env -f compose.stack.production.yml pull mirante
docker compose --env-file deploy/stack.production.env -f compose.stack.production.yml up -d mirante
```

When building from a source checkout before official images exist, replace
`pull mirante` with `build mirante`. Do not change the pinned GeoNode, GeoServer,
PostgreSQL, Redis, or Nginx versions as part of an unrelated Mirante update.
