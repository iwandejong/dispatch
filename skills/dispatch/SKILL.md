---
name: dispatch
description: Use the Dispatch work tracker over MCP (search, read, create and update issues, labels, comments). Use when the user mentions issues, tickets, tasks, project keys like AIG-123, "my work", or asks to track, pick up, move or finish work. Requires the dispatch MCP server (tools such as search_issues, create_issue, transition_issue).
---

# Working with Dispatch

Dispatch is the team's issue tracker, exposed as MCP tools. Prefer these tools over guessing or asking the user for issue details.

## Addressing things

- Issue: identifier, e.g. `AIG-123` (never internal ids)
- Project: identifier, e.g. `AIG`
- Assignee: `human` (the person you work with) or `agent` (you). Label: name.
- Not sure of a key? Call `list_projects`, or read the `NOT_FOUND` error: it lists valid alternatives.

Find which project this repo belongs to from context (`.mcp.json` URL, README, existing branch/commit names like `aig-123-…`). If unclear, ask once, then remember it.

## Workflows

**Pick up work**
1. `my_work` → open issues assigned to you (the agent).
2. `get_issue` for the chosen one (description, relations, comment count); `list_comments` if `commentCount > 0`.
3. Check relations: if it is `BLOCKED_BY` something not `DONE`, tell the user before starting.
4. `transition_issue` → `IN_PROGRESS`. Assign it to `agent` (`assign_issue`) if unassigned. Hand work back to the person with `assign_issue` → `human` (e.g. when you need a decision or a review).

**Find issues**: `search_issues` with filters, combined by AND. Prefer filters over free text:
- "my TODO issues in AI Gateway" → `{project:"AIG", status:["TODO"], assignee:"agent"}`
- unassigned bugs → `{assignee:"unassigned", label:"bug"}`
- `text` matches identifier, title, description, project and labels. `AIG-12` as text returns that issue first.
- Results are capped (default 25); narrow filters instead of raising `limit`.

**Create an issue**: `create_issue` needs only `project` and `title`. Write a title that states the outcome ("Add rate limiting per API key"). Put context, acceptance criteria and links in `description` (Markdown). Set `priority` and `labels` when known; unknown labels are created automatically. Search first (`search_issues`) to avoid duplicates; if duplicate, use `create_issue_relation` with `DUPLICATES`.

**Update as you work**
- Status: `transition_issue` — `BACKLOG → TODO → IN_PROGRESS → IN_REVIEW → DONE` (or `CANCELLED`). Move to `IN_REVIEW` when a PR is open, `DONE` only when merged/verified.
- Progress notes, decisions, blockers, PR links: `comment_on_issue` (Markdown). Keep comments short and factual.
- Several fields at once: `update_issue`. Single change: `set_priority`, `assign_issue`, `add_label`, `remove_label`. Pass `null` to unassign.
- Dependencies: `create_issue_relation` with `issue` as the subject: `{issue:"AIG-1", type:"BLOCKS", other:"AIG-2"}`.

**History**: `get_issue_activity` shows who changed what and when.

## Rules of thumb

- Read before you write: `get_issue` before updating anything you didn't just create.
- Don't change status, assignee or priority on issues the user didn't ask about, except the issue you're actively working on.
- Never `delete_issue` unless the user explicitly asks for that specific issue to be deleted; it is irreversible. Prefer `transition_issue` → `CANCELLED`.
- Don't create issues speculatively; propose them and let the user confirm, unless asked to file them.
- You are always the `agent` actor; the person is `human`. "Assign to me" means `agent`.
- Don't paste secrets or tokens into issues or comments; anyone with access to the tracker can read them.

## Reading results

Each tool returns a short text summary plus `structuredContent` (use it for ids and exact values). Errors are `isError` results shaped `CODE: message`:

| Code | Meaning / fix |
|---|---|
| `NOT_FOUND` | Wrong key; the message lists valid ones. Retry with a corrected key. |
| `INVALID_INPUT` | Bad field or enum value; the message names the field. |
| `CONFLICT` | Already exists (e.g. duplicate project identifier). Reuse the existing one. |
| HTTP 403 on connect | The request carried a foreign `Origin` header; use a normal MCP client (no browser). |
