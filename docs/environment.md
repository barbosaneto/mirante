# Production environment reference

This reference covers every environment variable consumed or deliberately
passed by the supplied production Compose files. GeoNode supports additional
upstream settings, but settings outside this supported deployment contract are
not exhaustively listed here.

Values called **required** have no safe production default. Placeholder values
in `deploy/stack.production.example.env` are examples, not defaults, and must be
replaced. Boolean values passed to GeoNode use Python-compatible `True` or
`False`; Mirante runtime booleans accept case-insensitive `true`, `false`, `1`,
or `0`.

## Compose and Mirante

| Variable                                     | Type                     | Required | Supplied default              | Purpose                                                                    |
| -------------------------------------------- | ------------------------ | -------- | ----------------------------- | -------------------------------------------------------------------------- |
| `COMPOSE_PROJECT_NAME`                       | Identifier               | No       | `mirante-production`          | Prefixes containers, network, and named volumes                            |
| `MIRANTE_STACK_ENV_FILE`                     | File path                | No       | `.env`                        | Private environment file injected into GeoNode services                    |
| `DOCKER_ENV`                                 | Enum                     | No       | `production`                  | Declares the upstream GeoNode container environment                        |
| `MIRANTE_IMAGE`                              | OCI image name           | No       | `ghcr.io/barbosaneto/mirante` | Public official frontend image                                             |
| `MIRANTE_VERSION`                            | Image tag/version string | No       | `0.1.2`                       | Immutable frontend release tag and OCI version label                       |
| `MIRANTE_HTTP_PORT`                          | TCP port integer         | No       | `8080`                        | Loopback port reached by the host HTTPS proxy                              |
| `MIRANTE_PUBLIC_URL`                         | Absolute HTTPS URL       | Yes      | None                          | Single browser origin for Mirante and all proxied GeoNode routes           |
| `MIRANTE_REQUIRE_AUTHENTICATION`             | Boolean                  | No       | `false`                       | Requires a restored GeoNode session before showing the client              |
| `MIRANTE_DATASET_UPLOAD_VISIBILITY_CONTROL`  | Boolean                  | No       | `true`                        | Offers public, private, and group visibility during upload                 |
| `MIRANTE_DATASET_UPLOAD_MAX_FILE_SIZE_BYTES` | Positive integer bytes   | No       | `104857600`                   | Frontend validation limit; 100 MiB                                         |
| `MIRANTE_PROXY_MAX_BODY_SIZE`                | Nginx size               | No       | `210m`                        | Proxy request limit including duplicated ZIP fields and multipart overhead |
| `GEONODE_INTERNAL_URL`                       | HTTP(S) origin           | Yes¹     | None                          | Upstream used by frontend-only deployment; fixed internally by full stack  |
| `MIRANTE_GEONODE_BASE_URL`                   | URL or root path         | No       | `/`                           | Browser API base; `/` preserves same-origin proxying                       |
| `MIRANTE_GEONODE_WEB_URL`                    | Absolute URL or `/`      | Yes¹     | None                          | GeoNode management origin in frontend-only deployment                      |

¹ Used directly by `compose.production.yml`. The complete stack derives the
equivalent values from its internal network and `MIRANTE_PUBLIC_URL`.

## Runtime images

| Variable                | Type                 | Required | Supplied default    | Purpose                                                |
| ----------------------- | -------------------- | -------- | ------------------- | ------------------------------------------------------ |
| `GEONODE_IMAGE`         | OCI image repository | No       | `geonode/geonode`   | Official GeoNode application image                     |
| `GEONODE_VERSION`       | Image tag            | No       | `5.1.0`             | Supported GeoNode release                              |
| `GEONODE_NGINX_IMAGE`   | OCI image repository | No       | `geonode/nginx`     | Official GeoNode proxy image                           |
| `GEONODE_NGINX_VERSION` | Image tag            | No       | `1.31.2-latest`     | Supported GeoNode proxy release                        |
| `GEOSERVER_IMAGE`       | OCI image repository | No       | `geonode/geoserver` | Official GeoServer image published by GeoNode          |
| `GEOSERVER_VERSION`     | Image tag            | No       | `2.28.4-latest`     | Supported GeoServer release                            |
| `POSTGIS_IMAGE`         | OCI image repository | No       | `geonode/postgis`   | Official GeoNode PostGIS image with database bootstrap |
| `POSTGIS_VERSION`       | Image tag            | No       | `15-3.5-latest`     | Supported PostgreSQL/PostGIS release                   |
| `MEMCACHED_IMAGE`       | OCI image repository | No       | `memcached`         | Official Memcached image                               |
| `MEMCACHED_VERSION`     | Image tag            | No       | `1.6-alpine`        | Supported Memcached release                            |
| `REDIS_IMAGE`           | OCI image repository | No       | `redis`             | Official Redis image                                   |
| `REDIS_VERSION`         | Image tag            | No       | `7-alpine`          | Supported Redis release                                |

The base Compose uses these official images directly on AMD64. GeoNode does not
currently publish ARM64 variants of its GeoNode, Nginx, GeoServer, and PostGIS
images. ARM64 deployments add `compose.arm64.yml`, which replaces exactly those
services with fixed native compatibility tags. Redis and Memcached use their
official multi-platform images on both architectures. Changing upstream
versions requires compatibility validation and, on ARM64, matching published
compatibility tags.

## GeoNode application and initial identity

| Variable                 | Type               | Required | Supplied default   | Purpose and behavior                                                      |
| ------------------------ | ------------------ | -------- | ------------------ | ------------------------------------------------------------------------- |
| `DJANGO_SETTINGS_MODULE` | Python module      | No       | `geonode.settings` | Uses the vanilla GeoNode settings module                                  |
| `GEONODE_INSTANCE_NAME`  | String             | No       | `Mirante GeoNode`  | Human-readable upstream instance name                                     |
| `SITEURL`                | Absolute HTTPS URL | Yes      | None               | Canonical GeoNode URL; include a trailing slash                           |
| `ALLOWED_HOSTS`          | Python list string | Yes      | None               | Django host allowlist; include `django`, `nginx`, and the public hostname |
| `DEBUG`                  | Boolean            | No       | `False`            | Must remain false on a public deployment                                  |
| `SECRET_KEY`             | Secret string      | Yes      | None               | Django cryptographic secret                                               |
| `FORCE_REINIT`           | Boolean            | No       | `false`            | Re-runs selected initialization; do not enable during routine updates     |
| `INVOKE_LOG_STDOUT`      | Boolean            | No       | `true`             | Sends GeoNode task logs to container output                               |
| `C_FORCE_ROOT`           | Boolean/integer    | No       | `1`                | Matches the upstream Celery container convention                          |
| `ADMIN_USERNAME`         | String             | Yes      | `admin`            | Initial GeoNode administrator username                                    |
| `ADMIN_PASSWORD`         | Secret string      | Yes      | None               | Applied during first initialization, not a password-rotation mechanism    |
| `ADMIN_EMAIL`            | Email              | Yes      | None               | Initial administrator email                                               |
| `OAUTH2_API_KEY`         | Secret string      | Yes      | None               | Protects GeoNode role endpoints used by GeoServer                         |
| `OAUTH2_CLIENT_ID`       | Secret identifier  | Yes      | None               | Initial GeoServer OAuth client identifier                                 |
| `OAUTH2_CLIENT_SECRET`   | Secret string      | Yes      | None               | Initial GeoServer OAuth client secret                                     |

Changing an initial administrator or OAuth value after the first successful
initialization does not reliably rotate the stored credential. Perform later
rotation through the owning GeoNode or GeoServer administration workflow.

## PostgreSQL and PostGIS

| Variable                       | Type                   | Required | Supplied default | Purpose                                                          |
| ------------------------------ | ---------------------- | -------- | ---------------- | ---------------------------------------------------------------- |
| `POSTGRES_USER`                | Identifier             | No       | `postgres`       | PostgreSQL bootstrap superuser                                   |
| `POSTGRES_PASSWORD`            | Secret string          | Yes      | None             | PostgreSQL bootstrap password                                    |
| `GEONODE_DATABASE`             | Identifier             | No       | `geonode`        | GeoNode application database                                     |
| `GEONODE_DATABASE_USER`        | Identifier             | No       | `geonode`        | GeoNode application database user                                |
| `GEONODE_DATABASE_PASSWORD`    | Secret string          | Yes      | None             | Application database password                                    |
| `GEONODE_GEODATABASE`          | Identifier             | No       | `geonode_data`   | Spatial datastore database                                       |
| `GEONODE_GEODATABASE_USER`     | Identifier             | No       | `geonode_data`   | Spatial datastore user                                           |
| `GEONODE_GEODATABASE_PASSWORD` | Secret string          | Yes      | None             | Spatial datastore password                                       |
| `GEONODE_DATABASE_SCHEMA`      | Identifier             | No       | `public`         | Application database schema                                      |
| `GEONODE_GEODATABASE_SCHEMA`   | Identifier             | No       | `public`         | Spatial datastore schema                                         |
| `DATABASE_HOST`                | Hostname               | No       | `db`             | Internal PostgreSQL service                                      |
| `DATABASE_PORT`                | TCP port integer       | No       | `5432`           | Internal PostgreSQL port                                         |
| `DATABASE_URL`                 | PostGIS connection URL | Yes      | None             | Application connection; password must match its individual value |
| `GEODATABASE_URL`              | PostGIS connection URL | Yes      | None             | Datastore connection; password must match its individual value   |
| `GEONODE_DB_CONN_MAX_AGE`      | Integer seconds        | No       | `0`              | Django persistent-connection lifetime                            |
| `GEONODE_DB_CONN_TOUT`         | Integer seconds        | No       | `5`              | GeoNode database connection timeout                              |
| `POSTGRESQL_MAX_CONNECTIONS`   | Positive integer       | No       | `200`            | PostgreSQL server connection limit                               |

Use URL-safe generated passwords or percent-encode connection URL credentials.
Never expose PostgreSQL's port from the supplied production stack.

## Workers, proxy, and GeoServer

| Variable                    | Type               | Required | Supplied default                   | Purpose                                                              |
| --------------------------- | ------------------ | -------- | ---------------------------------- | -------------------------------------------------------------------- |
| `BROKER_URL`                | Redis URL          | No       | `redis://redis:6379/0`             | Celery broker                                                        |
| `CELERY_RESULT_BACKEND`     | Redis URL          | No       | `redis://redis:6379/1`             | Celery result backend                                                |
| `CELERY_BEAT_SCHEDULER`     | Python class path  | No       | `celery.beat:PersistentScheduler`  | Periodic task scheduler                                              |
| `CELERY__BEAT_DB`           | File path          | No       | `/data/celerybeat-schedule`        | Persistent schedule database                                         |
| `ASYNC_SIGNALS`             | Boolean            | No       | `True`                             | Enables asynchronous GeoNode signal processing                       |
| `GEONODE_LB_HOST_IP`        | Hostname           | No       | `django`                           | GeoNode Nginx upstream                                               |
| `GEONODE_LB_PORT`           | TCP port integer   | No       | `8000`                             | Django/uWSGI upstream port                                           |
| `NGINX_BASE_URL`            | Absolute HTTPS URL | Yes      | None                               | Canonical upstream proxy URL                                         |
| `HTTP_HOST`                 | Hostname           | Yes      | None                               | Host accepted by internal GeoNode Nginx                              |
| `HTTPS_HOST`                | Hostname           | Yes      | None                               | Enables HTTPS semantics in internal GeoNode Nginx                    |
| `HTTP_PORT`                 | TCP port integer   | No       | `80`                               | Internal GeoNode Nginx HTTP port                                     |
| `HTTPS_PORT`                | TCP port integer   | No       | `443`                              | Internal GeoNode Nginx HTTPS port                                    |
| `LETSENCRYPT_MODE`          | Enum               | No       | `disabled`                         | Uses an internal self-issued certificate; public TLS belongs to edge |
| `RESOLVER`                  | IP address         | No       | `127.0.0.11`                       | Docker DNS resolver                                                  |
| `GEOSERVER_LB_HOST_IP`      | Hostname           | No       | `geoserver`                        | GeoServer service hostname                                           |
| `GEOSERVER_LB_PORT`         | TCP port integer   | No       | `8080`                             | GeoServer service port                                               |
| `GEOSERVER_LOCATION`        | Internal URL       | No       | `http://geoserver:8080/geoserver/` | Server-to-server GeoServer endpoint                                  |
| `GEOSERVER_PUBLIC_LOCATION` | Absolute HTTPS URL | Yes      | None                               | Browser-visible GeoServer endpoint                                   |
| `GEOSERVER_WEB_UI_LOCATION` | Absolute HTTPS URL | Yes      | None                               | GeoServer administration endpoint ending in `/geoserver/web/`        |
| `GEOSERVER_ADMIN_USER`      | Identifier         | No       | `admin`                            | GeoServer administrator username                                     |
| `GEOSERVER_ADMIN_PASSWORD`  | Secret string      | Yes      | None                               | GeoServer administrator password                                     |
| `GEOSERVER_CSRF_ENABLED`    | Boolean            | No       | `true`                             | Keeps GeoServer CSRF protection enabled                              |
| `GEOSERVER_CSRF_WHITELIST`  | Hostname list      | Yes      | None                               | Public hosts accepted by GeoServer CSRF protection                   |
| `GEOSERVER_JAVA_OPTS`       | JVM option string  | No       | See example                        | Memory, encoding, timezone, and GeoServer CSRF settings              |

The example gives GeoServer a 3 GiB maximum heap for the documented 24 GiB
host. Tune it only with memory monitoring. Because `GEOSERVER_JAVA_OPTS`
replaces the image defaults, preserve its encoding and CSRF options and the
`-Dgwc.context.suffix=gwc` option. The latter keeps GeoWebCache REST endpoints
separate from GeoServer catalog REST endpoints; omitting it can make dataset
publication appear successful while preventing the selected SLD style from
being assigned to the new layer.

`GEOSERVER_ADMIN_PASSWORD` is both the credential GeoNode uses for GeoServer
REST operations and the password initialized in GeoServer's persistent data
directory. Set it before the first startup. Changing only the environment file
after initialization does not rotate the password already stored by GeoServer;
if the two values diverge, imports fail with `401 Unauthorized`. Rotate the
password through GeoServer administration, update the environment with the
same value, and recreate `django`, `celery`, and `geoserver` so every process
loads the synchronized credential.

## Access, storage, and ingestion

| Variable                                 | Type              | Required | Supplied default                             | Purpose                                                                   |
| ---------------------------------------- | ----------------- | -------- | -------------------------------------------- | ------------------------------------------------------------------------- |
| `CORS_ALLOW_ALL_ORIGINS`                 | Boolean           | No       | `False`                                      | Does not make GeoNode APIs universally cross-origin                       |
| `X_FRAME_OPTIONS`                        | Enum              | No       | `SAMEORIGIN`                                 | Clickjacking response policy                                              |
| `SESSION_ENGINE`                         | Python class path | No       | `django.contrib.sessions.backends.cached_db` | Persists sessions in database with cache acceleration                     |
| `SESSION_EXPIRED_CONTROL_ENABLED`        | Boolean           | No       | `True`                                       | Enables GeoNode session-expiry middleware                                 |
| `SESSION_COOKIE_SECURE`                  | Boolean           | No       | `True`                                       | Sends session cookies only over HTTPS                                     |
| `CSRF_COOKIE_SECURE`                     | Boolean           | No       | `True`                                       | Sends CSRF cookies only over HTTPS                                        |
| `CSRF_COOKIE_HTTPONLY`                   | Boolean           | No       | `False`                                      | Must remain readable by Mirante's standard Django CSRF client flow        |
| `SECURE_SSL_REDIRECT`                    | Boolean           | No       | `False`                                      | Public HTTP-to-HTTPS redirect is owned by the host edge                   |
| `SECURE_HSTS_SECONDS`                    | Integer seconds   | No       | `0`                                          | HSTS is disabled until deliberately enabled at the public edge            |
| `ACCOUNT_OPEN_SIGNUP`                    | Boolean           | No       | `False`                                      | Disables public account creation                                          |
| `ACCOUNT_APPROVAL_REQUIRED`              | Boolean           | No       | `False`                                      | Requires approval only when explicitly enabled                            |
| `ACCOUNT_EMAIL_VERIFICATION`             | Enum              | No       | `none`                                       | Email verification mode; configure SMTP before enabling                   |
| `API_LOCKDOWN`                           | Boolean           | No       | `False`                                      | Keeps public read APIs available subject to resource permissions          |
| `LOCKDOWN_GEONODE`                       | Boolean           | No       | `False`                                      | Allows anonymous GeoNode pages; Mirante has its own authentication switch |
| `DEFAULT_ANONYMOUS_PERMISSIONS`          | Permission enum   | No       | `download`                                   | New-resource default: `view`, `download`, or `none`                       |
| `DEFAULT_REGISTERED_MEMBERS_PERMISSIONS` | Permission enum   | No       | `download`                                   | New-resource default: `view`, `download`, `edit`, `manage`, or `none`     |
| `STATIC_ROOT`                            | Directory path    | No       | `/mnt/volumes/statics/static/`               | Collected static files                                                    |
| `MEDIA_ROOT`                             | Directory path    | No       | `/mnt/volumes/statics/uploaded/`             | Uploaded media                                                            |
| `ASSETS_ROOT`                            | Directory path    | No       | `/mnt/volumes/statics/assets/`               | Generated assets                                                          |
| `DEFAULT_BACKEND_DATASTORE`              | Identifier        | No       | `datastore`                                  | Default GeoServer datastore                                               |
| `DEFAULT_BACKEND_UPLOADER`               | Python module     | No       | `geonode.importer`                           | Vanilla asynchronous importer                                             |
| `DEFAULT_MAX_UPLOAD_SIZE`                | Positive bytes    | No       | `104857600`                                  | GeoNode initial upload limit; later changes use GeoNode administration    |
| `DEFAULT_MAX_PARALLEL_UPLOADS_PER_USER`  | Positive integer  | No       | `5`                                          | Concurrent imports per user                                               |
| `MEMCACHED_ENABLED`                      | Boolean           | No       | `True`                                       | Enables the internal Memcached service                                    |
| `MEMCACHED_LOCATION`                     | Host and port     | No       | `memcached:11211`                            | Internal Memcached endpoint                                               |
| `TIME_ENABLED`                           | Boolean           | No       | `True`                                       | Enables GeoNode temporal handling                                         |
| `MOSAIC_ENABLED`                         | Boolean           | No       | `False`                                      | Disables mosaic ingestion unless deliberately enabled                     |
| `HAYSTACK_SEARCH`                        | Boolean           | No       | `False`                                      | Keeps optional Haystack indexing disabled                                 |

GeoNode notes that `DEFAULT_MAX_UPLOAD_SIZE` is an installation-time default;
later adjustments belong in its administration interface. Coordinate it with
the Mirante and edge proxy limits.

## Secrets and precedence

Never commit the private production environment. Compose interpolation uses the
file passed with `--env-file`, and GeoNode services receive the file named by
`MIRANTE_STACK_ENV_FILE`. Keep those paths aligned.

Shell environment variables can override Compose interpolation values. Inspect
unexpected shell exports before deployment. Do not print resolved Compose
configuration into shared CI logs because it contains database and application
secrets.
