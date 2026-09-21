#!/bin/sh
set -e
# No DATABASE_URL (plain `docker run`): run a bundled PostgreSQL, data in /data.
# With DATABASE_URL (compose, external DB): use that instead.
if [ -z "$DATABASE_URL" ]; then
  [ -f "$PGDATA/PG_VERSION" ] || initdb -U dispatch -A trust --auth-host=trust -D "$PGDATA" >/dev/null
  pg_ctl -w -D "$PGDATA" -o "-c listen_addresses=127.0.0.1 -c unix_socket_directories=/tmp" -l "$PGDATA/log" start >/dev/null
  psql -h 127.0.0.1 -U dispatch -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='dispatch'" | grep -q 1 \
    || createdb -h 127.0.0.1 -U dispatch dispatch
  export DATABASE_URL="postgresql://dispatch@127.0.0.1:5432/dispatch"
  trap 'kill $NODE_PID 2>/dev/null; pg_ctl -D "$PGDATA" -m fast stop >/dev/null; exit 0' TERM INT
fi
node /prisma-cli/node_modules/prisma/build/index.js migrate deploy
node server.js &
NODE_PID=$!
wait $NODE_PID
