import { beforeEach, describe, expect, it } from "vitest";
import { originAllowed } from "@/lib/mcp/origin";
import { handleMcp } from "@/lib/mcp/server";
import { db } from "@/lib/db";
import { fixture } from "./helpers";

const req = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("http://localhost:3000/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", host: "localhost:3000", ...headers },
    body: JSON.stringify(body),
  });

let n = 0;
async function rpc(method: string, params: unknown) {
  const res = await handleMcp(req({ jsonrpc: "2.0", id: ++n, method, params }));
  return { status: res.status, body: (await res.json()) as { result?: Record<string, unknown>; error?: { message: string } } };
}
const call = async (name: string, args: Record<string, unknown>) => {
  const r = await rpc("tools/call", { name, arguments: args });
  return r.body.result as { isError?: boolean; content: { text: string }[]; structuredContent?: Record<string, unknown> };
};

describe("MCP origin guard (no credentials, so browsers on other origins are refused)", () => {
  const r = (origin?: string) => new Request("http://x/mcp", { headers: { host: "localhost:3000", ...(origin ? { origin } : {}) } });
  it("allows non-browser clients and same-origin, refuses other origins", () => {
    expect(originAllowed(r())).toBe(true);
    expect(originAllowed(r("http://localhost:3000"))).toBe(true);
    expect(originAllowed(r("https://evil.example"))).toBe(false);
    expect(originAllowed(r("not a url"))).toBe(false);
  });
  it("returns 403 over HTTP for a cross-origin request", async () => {
    const res = await handleMcp(req({ jsonrpc: "2.0", id: 1, method: "tools/list" }, { origin: "https://evil.example" }));
    expect(res.status).toBe(403);
  });
});

describe("MCP tools", () => {
  beforeEach(async () => {
    await fixture();
  });

  it("lists the required tools", async () => {
    const names = ((await rpc("tools/list", {})).body.result?.tools as { name: string }[]).map((t) => t.name);
    for (const t of ["list_projects", "get_project", "search_issues", "get_issue", "create_issue", "update_issue", "transition_issue", "delete_issue", "assign_issue", "comment_on_issue", "my_work", "add_label", "remove_label", "set_priority", "list_comments", "get_issue_activity", "create_issue_relation"])
      expect(names).toContain(t);
  });

  it("runs an agent workflow as the agent, with concise text + structured data", async () => {
    const created = await call("create_issue", { project: "AIG", title: "Implement MCP transport", priority: "HIGH", assignee: "agent", status: "TODO" });
    expect(created.content[0].text).toContain("AIG-1");
    expect(created.content[0].text).toContain("Assignee: agent");
    const found = await call("search_issues", { project: "AIG", status: ["TODO"], assignee: "agent" });
    expect(found.structuredContent).toMatchObject({ count: 1, issues: [{ identifier: "AIG-1", status: "TODO", priority: "HIGH", createdBy: "AGENT" }] });
    await call("transition_issue", { issue: "AIG-1", status: "IN_PROGRESS" });
    expect((await call("my_work", {})).structuredContent).toMatchObject({ count: 1 });
    await call("comment_on_issue", { issue: "AIG-1", body: "started" });
    expect((await call("get_issue_activity", { issue: "AIG-1" })).content[0].text).toContain("STATUS_CHANGED");
    expect((await db.comment.findFirstOrThrow()).author).toBe("AGENT");
  });

  it("assigns to the human and can unassign", async () => {
    await call("create_issue", { project: "AIG", title: "t" });
    expect((await call("assign_issue", { issue: "AIG-1", assignee: "human" })).structuredContent).toMatchObject({ issue: { assignee: "HUMAN" } });
    expect((await call("assign_issue", { issue: "AIG-1", assignee: null })).structuredContent).toMatchObject({ issue: { assignee: null } });
    expect((await call("assign_issue", { issue: "AIG-1", assignee: "bob" })).isError).toBe(true);
  });

  it("rejects invalid input with an error result, not a crash", async () => {
    expect((await call("transition_issue", { issue: "AIG-1", status: "DOING" })).isError).toBe(true);
    expect((await call("create_issue", { project: "AIG" })).isError).toBe(true);
  });

  it("returns predictable NOT_FOUND errors", async () => {
    const r = await call("get_issue", { issue: "AIG-99" });
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toMatch(/^NOT_FOUND: /);
    expect((await call("create_issue", { project: "ZZZ", title: "x" })).content[0].text).toContain("Valid identifiers: AIG");
  });
});
