# Development

Postgres is never published to the host. Dev tooling runs in a `dev` container (Node 22) on the same compose network.

```sh
./scripts/dev-setup.sh              # .env, Postgres, test DB, deps (docker volume), migrations
./dx npm run db:seed                # DEV ONLY: example project AIG with sample issues
docker compose stop app             # if the production-style app container is running
./dx --service-ports npm run dev    # http://localhost:3000
```

`./dx <cmd>` runs a command in the `dev` container; `./dx --service-ports <cmd>` also publishes port 3000.

| Task | Command |
|---|---|
| Validate schema | `./dx npx prisma validate` |
| New migration | `./dx npx prisma migrate dev --name <name>` |
| Type check | `./dx npm run typecheck` |
| Tests (real Postgres, `dispatch_test`) | `./dx npm test` |
| Lint | `./dx npx eslint .` |
| Production build | `./dx npx next build --webpack` (webpack builder: fits in ~2 GB RAM; Turbopack needs more) |

Tests use the `dispatch_test` database (`TEST_DATABASE_URL`, provided by the `dev` service). After adding a migration, apply it to both databases: `./dx sh -c 'npx prisma migrate deploy && DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy'`.

Logs: `docker compose logs -f app` (JSON lines). Audit log: Settings → Audit log.

## Conventions

- New behaviour goes in `lib/services/`, with a test in `tests/`; then expose it via an action and/or MCP tool.
- Validate external input with Zod (`lib/schemas.ts`). Avoid `any`.
- Add shadcn components with `npx shadcn@latest add <name>`.
