# Contributing

Thanks for helping! Dispatch aims to stay small: a single Next.js app + PostgreSQL, fully air-gapped, MCP as a first-class interface. Please keep dependencies minimal and avoid anything that needs the network at runtime.

1. Set up per [DEVELOPMENT.md](DEVELOPMENT.md) (everything runs in Docker; Postgres is never published).
2. Put behaviour in `lib/services/` (one source of truth for UI and MCP), validate input with Zod, add a test in `tests/`.
3. Before opening a PR run: `./dx npx prisma validate && ./dx npm run typecheck && ./dx npx eslint . && ./dx npm test`.
4. Schema changes need a Prisma migration (`./dx npx prisma migrate dev --name <name>`).
5. UI: use shadcn/ui components (`npx shadcn@latest add <name>`); edits go through Dialogs.
6. Update the docs (`README.md`, `MCP.md`, `ARCHITECTURE.md`, `skills/dispatch/SKILL.md`) when behaviour or MCP tools change.
