# Architecture

One Next.js app (App Router) + PostgreSQL. Nothing else at runtime.

```
app/            pages, /mcp route handler
components/     React UI (shadcn/ui + a few app components)
lib/actions.ts  Server Actions: attributed to HUMAN → Zod validation (in services) → service → ActionResult
lib/mcp/        MCP server: origin.ts (cross-origin guard), tools.ts (tool definitions), server.ts (transport)
lib/audit.ts     withAudit(): JSON log line + AuditLog row around every UI action / MCP tool call
lib/log.ts       structured stdout logger with secret redaction
lib/services/   ALL business behaviour (the single source of truth)
lib/schemas.ts  Zod schemas + enum labels shared by UI and MCP
prisma/         schema, migrations, dev seed
```

## Rules

- Components and MCP tools never touch Prisma; they call services.
- Services validate input with Zod, enforce rules, and write **activity rows in the same transaction** as the change, so UI and MCP behave identically.
- Errors are `AppError(code)`; actions turn them into toasts, MCP into `CODE: message` tool errors.

## Decisions

- **Issue numbers**: `Project.nextIssueNumber` incremented inside the create transaction (row lock → race-free); `@@unique([projectId, issueNumber])`.
- **Actors, not accounts**: a Prisma enum `Actor { HUMAN, AGENT }` replaces users. Server Actions act as `HUMAN`, MCP tools as `AGENT`; it is stored on issues (`createdBy`, `assignee`), comments, activity and audit rows. There is no authentication; the guard rails are a localhost-only port binding and an `Origin` check on `/mcp`.
- **Search**: Prisma `contains` (case-insensitive) over identifier, title, description, project, assignee, labels, accelerated by `pg_trgm` GIN indexes (see migration `search_trgm`). Ranking: exact identifier > title match > others. Ceiling: fine for tens of thousands of issues; move to `tsvector` if you outgrow it.
- **MCP**: stateless Streamable HTTP; a fresh server per request (no sessions to lose on restart).
- **Air-gap**: fonts via the bundled `geist` package, Markdown images are not loaded remotely, no telemetry (`NEXT_TELEMETRY_DISABLED=1` in the image), no external calls anywhere.
- **Relations**: stored once (`BLOCKED_BY` is normalised to `BLOCKS` in the other direction) and mirrored when read.

## Traceability

Two layers: (1) `Activity` rows written inside the same transaction as each issue change (per-issue history), and (2) `AuditLog` rows written by `withAudit` for every mutating UI action / MCP tool call, including failures, which survive deletion of the thing they refer to (e.g. a deleted issue). Successful reads are logged to stdout only. Audit rows are written after the operation, not in its transaction.

## Data model

Project, Issue, Label (M2M with Issue), Comment, IssueRelation, Activity, AuditLog. See `prisma/schema.prisma`. `Project.nextIssueNumber` backs issue numbering.
