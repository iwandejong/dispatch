import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Actor } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { withAudit } from "@/lib/audit";
import { prioritySchema, relationTypeSchema, statusSchema } from "@/lib/schemas";
import * as issues from "@/lib/services/issue-service";
import * as projects from "@/lib/services/project-service";
import * as comments from "@/lib/services/comment-service";
import { searchIssues } from "@/lib/services/search-service";
import type { IssueSummary } from "@/lib/services/issue-service";

const line = (i: IssueSummary) =>
  [
    i.identifier,
    i.title,
    `Status: ${i.status}`,
    `Priority: ${i.priority}`,
    `Assignee: ${i.assignee?.toLowerCase() ?? "unassigned"}`,
    ...(i.labels.length ? [`Labels: ${i.labels.join(", ")}`] : []),
  ].join("\n  ");


type Result = { content: { type: "text"; text: string }[]; structuredContent?: Record<string, unknown>; isError?: boolean };
const ok = (text: string, data: Record<string, unknown>): Result => ({
  content: [{ type: "text", text }],
  structuredContent: JSON.parse(JSON.stringify(data)),
});

/** Turn thrown errors into predictable `CODE: message` tool errors an agent can act on. */
function fail(e: unknown): Result {
  let text: string;
  if (e instanceof AppError) text = e.toString();
  else if (e instanceof z.ZodError) text = `INVALID_INPUT: ${e.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ")}`;
  else {
    console.error("MCP tool error:", e instanceof Error ? e.message : "unknown");
    text = "INTERNAL: unexpected server error";
  }
  return { content: [{ type: "text", text }], isError: true };
}

const issueKey = z.string().describe('Issue identifier such as "AIG-123"');
const projectKey = z.string().describe('Project identifier such as "AIG"');

export function registerTools(server: McpServer, actor: Actor) {
  // The SDK's generics can't follow a helper-wrapped shape; validation still happens in the SDK from `inputSchema`.
  const register = server.registerTool.bind(server) as unknown as (
    name: string,
    config: { description: string; inputSchema: z.ZodRawShape },
    handler: (args: unknown) => Promise<Result>,
  ) => void;
  function tool<S extends z.ZodRawShape>(name: string, description: string, shape: S, run: (a: z.infer<z.ZodObject<S>>) => Promise<Result>) {
    const read = /^(list|get|search|my)_/.test(name);
    register(name, { description, inputSchema: shape }, async (args) => {
      try {
        return await withAudit({ source: "mcp", action: name, actor, args, read }, () => run(args as z.infer<z.ZodObject<S>>));
      } catch (e) {
        return fail(e);
      }
    });
  }
  const one = (i: IssueSummary, verb: string) => ok(`${verb}\n${line(i)}`, { issue: i });

  tool("list_projects", "List all projects with identifiers and issue counts.", {}, async () => {
    const rows = await projects.listProjects();
    const data = rows.map((p) => ({ id: p.id, identifier: p.identifier, name: p.name, description: p.description, issueCount: p._count.issues }));
    return ok(data.map((p) => `${p.identifier} · ${p.name} · ${p.issueCount} issues`).join("\n") || "No projects.", { projects: data });
  });

  tool("get_project", "Get one project: description, issue counts by status and labels.", { project: projectKey }, async ({ project }) => {
    const p = await projects.getProject(project);
    const data = {
      id: p.id, identifier: p.identifier, name: p.name, description: p.description,
      statusCounts: p.statusCounts, labels: p.labels.map((l) => l.name),
    };
    return ok(`${p.identifier} · ${p.name}\n${p.description}\nStatus counts: ${JSON.stringify(p.statusCounts)}\nLabels: ${data.labels.join(", ") || "none"}`, data);
  });

  tool(
    "search_issues",
    'Search/filter issues. All filters are optional and combine with AND. Example: "my TODO issues in AI Gateway" → {project:"AIG", status:["TODO"], assignee:"agent"}. assignee is "human", "agent" or "unassigned". `text` matches identifier, title, description, project and labels.',
    {
      text: z.string().optional(),
      project: z.string().optional().describe("Project identifier"),
      status: z.array(statusSchema).optional(),
      priority: z.array(prioritySchema).optional(),
      assignee: z.enum(["human", "agent", "unassigned"]).optional(),
      label: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(25),
    },
    async (a) => {
      const rows = await searchIssues(a);
      return ok(rows.length ? `${rows.length} issue(s)\n${rows.map(line).join("\n")}` : "No issues matched.", { count: rows.length, issues: rows });
    },
  );

  tool("get_issue", "Get full details of one issue including description and relations.", { issue: issueKey }, async ({ issue }) => {
    const i = await issues.getIssue(issue);
    const rel = i.relations.map((r) => `${r.type} ${r.identifier} (${r.status})`).join("; ");
    return ok(`${line(i)}\n\n${i.description || "(no description)"}${rel ? `\n\nRelations: ${rel}` : ""}\nComments: ${i.commentCount}`, { issue: i });
  });

  tool(
    "create_issue",
    "Create an issue. Only project and title are required. Unknown labels are created automatically.",
    {
      project: projectKey,
      title: z.string(),
      description: z.string().optional().describe("Markdown"),
      status: statusSchema.optional(),
      priority: prioritySchema.optional(),
      assignee: z.enum(["human", "agent"]).optional().describe("Who owns it"),
      labels: z.array(z.string()).optional(),
    },
    async (a) => one(await issues.createIssue(actor, a), "Created"),
  );

  tool(
    "update_issue",
    "Update any of title, description, status, priority, assignee (null to unassign). Only provided fields change.",
    {
      issue: issueKey,
      title: z.string().optional(),
      description: z.string().optional(),
      status: statusSchema.optional(),
      priority: prioritySchema.optional(),
      assignee: z.enum(["human", "agent"]).nullable().optional(),
    },
    async ({ issue, ...patch }) => one(await issues.updateIssue(actor, issue, patch), "Updated"),
  );

  tool("delete_issue", "Permanently delete an issue and its comments, activity and relations. Irreversible: only call when the user explicitly asked to delete it.", { issue: issueKey }, async ({ issue }) => {
    const r = await issues.deleteIssue(issue);
    return ok(`Deleted ${r.identifier}: ${r.title}`, { deleted: r });
  });

  tool("transition_issue", "Move an issue to a new status (BACKLOG, TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELLED).", { issue: issueKey, status: statusSchema }, async (a) =>
    one(await issues.updateIssue(actor, a.issue, { status: a.status }), `Status → ${a.status}`),
  );

  tool("assign_issue", 'Assign an issue to "human" (the person) or "agent" (you), or pass null to unassign.', { issue: issueKey, assignee: z.enum(["human", "agent"]).nullable() }, async (a) =>
    one(await issues.updateIssue(actor, a.issue, { assignee: a.assignee }), a.assignee ? `Assigned to ${a.assignee}` : "Unassigned"),
  );

  tool("set_priority", "Set issue priority.", { issue: issueKey, priority: prioritySchema }, async (a) =>
    one(await issues.updateIssue(actor, a.issue, { priority: a.priority }), `Priority → ${a.priority}`),
  );

  tool("add_label", "Add a label to an issue (created if it does not exist).", { issue: issueKey, label: z.string() }, async (a) =>
    one(await issues.addLabel(actor, a.issue, a.label), `Label added: ${a.label}`),
  );

  tool("remove_label", "Remove a label from an issue.", { issue: issueKey, label: z.string() }, async (a) =>
    one(await issues.removeLabel(actor, a.issue, a.label), `Label removed: ${a.label}`),
  );

  tool("comment_on_issue", "Add a Markdown comment to an issue.", { issue: issueKey, body: z.string() }, async (a) => {
    const c = await comments.addComment(actor, a.issue, { body: a.body });
    return ok(`Comment added to ${a.issue}`, { comment: c });
  });

  tool("list_comments", "List comments on an issue, oldest first.", { issue: issueKey }, async ({ issue }) => {
    const rows = await comments.listComments(issue);
    return ok(rows.map((c) => `[${c.createdAt.toISOString()}] ${c.author.toLowerCase()}: ${c.body}`).join("\n") || "No comments.", { comments: rows });
  });

  tool("get_issue_activity", "Get the change history of an issue (status, assignee, priority, label and comment events).", { issue: issueKey }, async ({ issue }) => {
    const rows = await issues.getActivity(issue);
    return ok(rows.map((a) => `[${a.createdAt.toISOString()}] ${a.actor.toLowerCase()}: ${a.type}${a.from || a.to ? ` ${a.from ?? "∅"} → ${a.to ?? "∅"}` : ""}`).join("\n"), { activity: rows });
  });

  tool(
    "create_issue_relation",
    'Relate two issues. Type is from the perspective of `issue`: BLOCKS, BLOCKED_BY, RELATES_TO, DUPLICATES (e.g. issue "AIG-1" BLOCKS "AIG-2").',
    { issue: issueKey, type: relationTypeSchema, other: issueKey },
    async (a) => {
      const r = await issues.createRelation(actor, a.issue, a.type, a.other);
      return ok(`${r.from} ${r.type} ${r.to}`, { relation: r });
    },
  );

  tool("my_work", "List open issues assigned to the agent (you). Pass includeDone to include DONE/CANCELLED.", { includeDone: z.boolean().optional() }, async (a) => {
    const rows = await issues.myWork(actor, a);
    return ok(rows.length ? rows.map(line).join("\n") : "Nothing assigned.", { count: rows.length, issues: rows });
  });
}
