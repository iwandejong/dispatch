# MCP

Endpoint: `http://localhost:15000/mcp` — MCP **Streamable HTTP**, stateless, JSON responses. Implemented in the Next.js app with the official `@modelcontextprotocol/sdk`.

## Identity and access

There is no token or login. Everything arriving over MCP is recorded as the **agent**; everything done in the browser is recorded as **you** (the human). Issues can be assigned to `"human"` or `"agent"`, and `my_work` returns the agent's open issues.

Because the endpoint has no credentials, it refuses browser requests from other origins (HTTP 403 if an `Origin` header doesn't match the host), and the app is published on `0.0.0.0:15000`. See [SECURITY.md](SECURITY.md).

## Client configuration

Claude Code:

```sh
claude mcp add --transport http dispatch http://localhost:15000/mcp
```

or `.mcp.json`:

```json
{
  "mcpServers": {
    "dispatch": {
      "type": "http",
      "url": "http://localhost:15000/mcp"
    }
  }
}
```

Some clients call this transport `streamable-http` instead of `http`; the URL is identical.

## Tools

| Tool | Purpose |
|---|---|
| `list_projects`, `get_project` | Projects, status counts, labels |
| `search_issues` | Filter by `project`, `status[]`, `priority[]`, `assignee` (or `unassigned`), `label`, `text` |
| `get_issue` | Full issue with description and relations |
| `create_issue`, `update_issue` | Create / patch fields |
| `delete_issue` | Permanently delete an issue (irreversible; only on explicit request) |
| `transition_issue`, `assign_issue`, `set_priority` | Single-purpose workflow steps |
| `add_label`, `remove_label` | Labels (created on demand) |
| `comment_on_issue`, `list_comments`, `get_issue_activity` | Discussion and history |
| `create_issue_relation` | `BLOCKS`, `BLOCKED_BY`, `RELATES_TO`, `DUPLICATES` |
| `my_work` | Open issues assigned to the agent |

Issues are addressed by identifier (`AIG-123`); projects by identifier (`AIG`); assignee is `human` or `agent`.

## Responses

Every tool returns a short text block plus `structuredContent`:

```
AIG-123
  Implement MCP authentication
  Status: IN_PROGRESS
  Priority: HIGH
  Assignee: agent
```

```json
{ "issue": { "id": "…", "identifier": "AIG-123", "title": "…", "status": "IN_PROGRESS", "priority": "HIGH",
             "assignee": "AGENT", "project": { "identifier": "AIG" },
            , "labels": ["security"] } }
```

## Errors

Failures are tool results with `isError: true` and text `CODE: message`, where CODE is `NOT_FOUND`, `INVALID_INPUT`, `CONFLICT` or `INTERNAL`. Not-found messages list valid alternatives (e.g. `Valid identifiers: AIG`). Schema violations are rejected by the SDK before the tool runs.

## Try it

```sh
curl -s http://localhost:15000/mcp \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Traceability

Every tool call is logged as a JSON line on the server's stdout (`source: "mcp"`, tool name, target, result, duration; secret-looking argument keys are redacted and long text truncated). Mutating calls, and any failing call, are also stored in the audit log, visible to admins under Settings → Audit log.
