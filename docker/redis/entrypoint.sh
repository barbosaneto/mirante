#!/bin/sh

set -eu

if [ "$(id -u)" = "0" ]; then
  chown -R redis:redis /data
  exec gosu redis "$@"
fi

exec "$@"
