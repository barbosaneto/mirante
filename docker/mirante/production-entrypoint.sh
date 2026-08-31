#!/bin/sh

set -eu

fail() {
  printf 'Mirante configuration error: %s\n' "$1" >&2
  exit 1
}

normalize_boolean() {
  case "$1" in
    true | TRUE | True | 1) printf 'true' ;;
    false | FALSE | False | 0) printf 'false' ;;
    *) fail "$2 must be true or false" ;;
  esac
}

validate_public_url() {
  if ! printf '%s' "$1" | grep -Eq '^/$|^/[A-Za-z0-9._~!$&()*+,;=:@%/-]+$|^https?://[A-Za-z0-9._~:/?#@!$&()*+,;=%-]+$'; then
    fail "$2 must be an absolute HTTP(S) URL or a root-relative path"
  fi
}

geonode_internal_url="${GEONODE_INTERNAL_URL:-}"
geonode_internal_url="${geonode_internal_url%/}"
if ! printf '%s' "$geonode_internal_url" | grep -Eq '^https?://[A-Za-z0-9._:-]+$'; then
  fail "GEONODE_INTERNAL_URL must be an HTTP(S) origin without a path"
fi

geonode_base_url="${MIRANTE_GEONODE_BASE_URL:-/}"
geonode_web_url="${MIRANTE_GEONODE_WEB_URL:-/}"
validate_public_url "$geonode_base_url" "MIRANTE_GEONODE_BASE_URL"
validate_public_url "$geonode_web_url" "MIRANTE_GEONODE_WEB_URL"

require_authentication="$(normalize_boolean "${MIRANTE_REQUIRE_AUTHENTICATION:-false}" "MIRANTE_REQUIRE_AUTHENTICATION")"
visibility_control="$(normalize_boolean "${MIRANTE_DATASET_UPLOAD_VISIBILITY_CONTROL:-true}" "MIRANTE_DATASET_UPLOAD_VISIBILITY_CONTROL")"
google_oidc_enabled="$(normalize_boolean "${MIRANTE_GOOGLE_OIDC_ENABLED:-true}" "MIRANTE_GOOGLE_OIDC_ENABLED")"

maximum_upload_size="${MIRANTE_DATASET_UPLOAD_MAX_FILE_SIZE_BYTES:-104857600}"
if ! printf '%s' "$maximum_upload_size" | grep -Eq '^[1-9][0-9]*$'; then
  fail "MIRANTE_DATASET_UPLOAD_MAX_FILE_SIZE_BYTES must be a positive integer"
fi

proxy_max_body_size="${MIRANTE_PROXY_MAX_BODY_SIZE:-210m}"
if ! printf '%s' "$proxy_max_body_size" | grep -Eq '^[1-9][0-9]*[kKmMgG]?$'; then
  fail "MIRANTE_PROXY_MAX_BODY_SIZE must be a positive Nginx size"
fi

cat > /tmp/runtime-config.js <<EOF
window.__MIRANTE_RUNTIME_CONFIG__ = Object.freeze({
  datasetUploadMaximumFileSizeBytes: ${maximum_upload_size},
  datasetUploadVisibilityControl: ${visibility_control},
  geonodeBaseUrl: "${geonode_base_url}",
  geonodeWebUrl: "${geonode_web_url}",
  googleOidcEnabled: ${google_oidc_enabled},
  requireAuthentication: ${require_authentication}
});
EOF

export GEONODE_INTERNAL_URL="$geonode_internal_url"
export MIRANTE_PROXY_MAX_BODY_SIZE="$proxy_max_body_size"
envsubst '${GEONODE_INTERNAL_URL} ${MIRANTE_PROXY_MAX_BODY_SIZE}' \
  < /etc/nginx/templates/mirante.conf.template \
  > /tmp/mirante.conf

exec "$@"
