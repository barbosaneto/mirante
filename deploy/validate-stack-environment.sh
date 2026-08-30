#!/bin/sh

set -eu

environment_file="${1:-.env}"
compose_file="${2:-compose.stack.production.yml}"
override_file="${3:-}"

fail() {
  printf 'Production environment error: %s\n' "$1" >&2
  exit 1
}

read_value() {
  sed -n "s/^$1=//p" "$environment_file" | tail -n 1
}

[ -f "$environment_file" ] || fail "$environment_file does not exist"
[ -f "$compose_file" ] || fail "$compose_file does not exist"
[ -z "$override_file" ] || [ -f "$override_file" ] ||
  fail "$override_file does not exist"

if grep -n 'replace-with-' "$environment_file"; then
  fail "replace every placeholder before deployment"
fi

for required_variable in \
  MIRANTE_PUBLIC_URL \
  SITEURL \
  SECRET_KEY \
  ADMIN_PASSWORD \
  OAUTH2_API_KEY \
  OAUTH2_CLIENT_ID \
  OAUTH2_CLIENT_SECRET \
  POSTGRES_PASSWORD \
  GEONODE_DATABASE_PASSWORD \
  GEONODE_GEODATABASE_PASSWORD \
  DATABASE_URL \
  GEODATABASE_URL \
  NGINX_BASE_URL \
  HTTP_HOST \
  HTTPS_HOST \
  GEOSERVER_PUBLIC_LOCATION \
  GEOSERVER_WEB_UI_LOCATION \
  GEOSERVER_ADMIN_PASSWORD
do
  [ -n "$(read_value "$required_variable")" ] ||
    fail "$required_variable is required"
done

public_url="$(read_value MIRANTE_PUBLIC_URL)"
case "$public_url" in
  https://*) ;;
  *) fail "MIRANTE_PUBLIC_URL must use HTTPS" ;;
esac
public_host="${public_url#https://}"
public_host="${public_host%%/*}"

[ "$(read_value SITEURL)" = "${public_url%/}/" ] ||
  fail "SITEURL must match MIRANTE_PUBLIC_URL and include a trailing slash"
[ "$(read_value NGINX_BASE_URL)" = "${public_url%/}" ] ||
  fail "NGINX_BASE_URL must match MIRANTE_PUBLIC_URL"
[ "$(read_value HTTP_HOST)" = "$public_host" ] ||
  fail "HTTP_HOST must match the MIRANTE_PUBLIC_URL hostname"
[ "$(read_value HTTPS_HOST)" = "$public_host" ] ||
  fail "HTTPS_HOST must match the MIRANTE_PUBLIC_URL hostname"
[ "$(read_value GEOSERVER_PUBLIC_LOCATION)" = "${public_url%/}/geoserver/" ] ||
  fail "GEOSERVER_PUBLIC_LOCATION must use MIRANTE_PUBLIC_URL/geoserver/"
[ "$(read_value GEOSERVER_WEB_UI_LOCATION)" = "${public_url%/}/geoserver/web/" ] ||
  fail "GEOSERVER_WEB_UI_LOCATION must use MIRANTE_PUBLIC_URL/geoserver/web/"

[ "$(read_value DEBUG)" = "False" ] || fail "DEBUG must be False"
[ "$(read_value CORS_ALLOW_ALL_ORIGINS)" = "False" ] ||
  fail "CORS_ALLOW_ALL_ORIGINS must be False"
[ "$(read_value SESSION_COOKIE_SECURE)" = "True" ] ||
  fail "SESSION_COOKIE_SECURE must be True"
[ "$(read_value CSRF_COOKIE_SECURE)" = "True" ] ||
  fail "CSRF_COOKIE_SECURE must be True"

if [ -n "$override_file" ]; then
  MIRANTE_STACK_ENV_FILE="$environment_file" docker compose \
    --env-file "$environment_file" \
    -f "$compose_file" \
    -f "$override_file" \
    config --quiet
else
  MIRANTE_STACK_ENV_FILE="$environment_file" docker compose \
    --env-file "$environment_file" \
    -f "$compose_file" \
    config --quiet
fi

printf 'Production environment validation passed.\n'
