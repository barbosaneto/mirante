#!/bin/sh

set -eu

dependency_marker="node_modules/.mirante-package-lock.json"

if ! cmp -s package-lock.json "$dependency_marker"; then
  npm ci
  cp package-lock.json "$dependency_marker"
fi

exec "$@"
