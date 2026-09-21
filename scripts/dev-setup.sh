#!/bin/sh
# One-time (idempotent) dev setup: .env, Postgres, test database, dependencies, migrations.
set -e
if docker compose version >/dev/null 2>&1; then DC="docker compose"; else DC="docker-compose"; fi
[ -e .env ] || ./scripts/init-env.sh
$DC up -d --wait postgres
$DC exec -T postgres psql -U dispatch -d dispatch -tc "select 1 from pg_database where datname='dispatch_test'" | grep -q 1 \
  || $DC exec -T postgres psql -U dispatch -d dispatch -c "create database dispatch_test"
./dx sh -c 'npm ci --no-audit --no-fund && npx prisma migrate deploy && DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy'
echo "Ready. Try: ./dx npm test   |   ./dx npm run db:seed   |   ./dx --service-ports npm run dev"
