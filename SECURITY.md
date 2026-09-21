# Security

Dispatch is a single-user tool for you and your coding agent, designed for private, air-gapped use on your own machine. **It has no authentication.** Read this before exposing it anywhere else.

## Reporting a vulnerability

Please report privately via GitHub's **"Report a vulnerability"** (Security tab → Advisories) rather than a public issue. Include steps to reproduce and the affected version. We aim to acknowledge reports within a few days.

## Threat model and defaults

- Anyone who can reach port 3000 can read and change everything, in the UI and over `/mcp`. Therefore the app is published on `127.0.0.1` only (`BIND_ADDRESS`, default `127.0.0.1`).
- If you set `BIND_ADDRESS=0.0.0.0` or run behind a reverse proxy, put authentication in front (VPN, SSO-aware proxy, basic auth, ...). Do not expose it to the internet as-is.
- `/mcp` rejects browser requests whose `Origin` differs from the host (blocks drive-by requests from web pages you visit). It does not authenticate non-browser clients.
- Postgres is not published to the host; keep it that way. Use a strong `POSTGRES_PASSWORD` (`./scripts/init-env.sh` generates one) and never commit `.env`.
- The audit log and JSON logs redact secret-looking argument keys, but they contain issue titles and other content you type. Treat them as sensitive.
- The app makes no outbound network requests and includes no telemetry.

## Known advisories

`npm audit` reports a `deepmerge-ts` denial-of-service advisory inside the Prisma CLI (`prisma` → `@prisma/config`). The CLI is build/migration tooling only, is a dev dependency, and never processes untrusted input here; the fix requires a Prisma major release. It will be picked up when Prisma 8 is stable.
