import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { withAudit } from "@/lib/audit";
import { sanitize } from "@/lib/log";
import { AppError } from "@/lib/errors";
import { addComment } from "@/lib/services/comment-service";
import { createIssue, deleteIssue, getIssue, createRelation } from "@/lib/services/issue-service";
import { listAudit } from "@/lib/services/audit-service";
import { handleMcp } from "@/lib/mcp/server";
import { fixture } from "./helpers";

beforeEach(async () => {
  await fixture();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("delete issue", () => {
  it("removes the issue and cascades comments, activity and relations", async () => {
    await createIssue("HUMAN", { project: "AIG", title: "a" });
    await createIssue("HUMAN", { project: "AIG", title: "b" });
    await addComment("HUMAN", "AIG-1", { body: "hi" });
    await createRelation("HUMAN", "AIG-1", "BLOCKS", "AIG-2");
    const r = await deleteIssue("AIG-1");
    expect(r).toMatchObject({ identifier: "AIG-1", title: "a" });
    await expect(getIssue("AIG-1")).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await db.comment.count()).toBe(0);
    expect(await db.issueRelation.count()).toBe(0);
    expect((await getIssue("AIG-2")).relations).toEqual([]);
    await expect(deleteIssue("AIG-1")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("does not reuse a deleted issue number", async () => {
    await createIssue("HUMAN", { project: "AIG", title: "a" });
    await deleteIssue("AIG-1");
    expect((await createIssue("HUMAN", { project: "AIG", title: "b" })).identifier).toBe("AIG-2");
  });
});

describe("audit trail", () => {
  it("records mutations, redacts secrets, and records failures", async () => {
    await withAudit({ source: "ui", action: "project.create", actor: "HUMAN", args: { name: "bob", password: "hunter22!" } }, async () => 1);
    await expect(withAudit({ source: "mcp", action: "get_issue", actor: "AGENT", args: { issue: "AIG-9" }, read: true }, async () => { throw new AppError("NOT_FOUND", "nope"); })).rejects.toThrow();
    await withAudit({ source: "mcp", action: "search_issues", actor: "AGENT", args: {}, read: true }, async () => 1); // successful read: not stored

    const rows = await listAudit();
    expect(rows.map((r) => r.action).sort()).toEqual(["get_issue", "project.create"]);
    const create = rows.find((r) => r.action === "project.create")!;
    expect(JSON.stringify(create.meta)).not.toContain("hunter22");
    expect(create).toMatchObject({ ok: true, target: "bob", source: "ui", actor: "HUMAN" });
    expect(rows.find((r) => r.action === "get_issue")).toMatchObject({ ok: false, error: "NOT_FOUND: nope", target: "AIG-9" });
  });

  it("sanitize redacts nested secrets and truncates long text", () => {
    const out = sanitize({ a: { Authorization: "Bearer x", token: "t" }, body: "x".repeat(500) }) as { a: Record<string, string>; body: string };
    expect(out.a).toEqual({ Authorization: "[redacted]", token: "[redacted]" });
    expect(out.body.length).toBeLessThan(260);
  });

  it("MCP tool calls are audited as the agent", async () => {
    const res = await handleMcp(new Request("http://x/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream", },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "create_issue", arguments: { project: "AIG", title: "via agent" } } }),
    }));
    expect(res.status).toBe(200);
    const rows = await db.auditLog.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ source: "mcp", actor: "AGENT", action: "create_issue", ok: true, target: "AIG" });
  });
});
