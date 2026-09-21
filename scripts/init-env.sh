#!/bin/sh
# Creates .env with a random database password. Refuses to overwrite an existing .env.
set -e
[ -e .env ] && { echo ".env already exists; not touching it." >&2; exit 1; }
printf 'POSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 16)" > .env
chmod 600 .env
echo "Created .env. Next: docker compose up -d, then open http://localhost:3000"
