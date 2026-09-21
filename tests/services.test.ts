import { beforeEach, describe, expect, it } from "vitest";
import { addLabel, createIssue, myWork, createRelation, getActivity, getIssue, removeLabel, updateIssue } from "@/lib/services/issue-service";
import { addComment, listComments } from "@/lib/services/comment-service";
import { searchIssues } from "@/lib/services/search-service";
import { fixture } from "./helpers";

beforeEach(async () => {
  await fixture();
});

const mk = (title: string, extra: Record<string, unknown> = {}) => createIssue("HUMAN", { project: "AIG", title, ...extra });

describe("issues", () => {
  it("creates with defaults, identifier and ISSUE_CREATED activity", async () => {
    const i = await mk("First", { labels: ["bug"] });
    expect(i.identifier).toBe("AIG-1");
    expect(i.status).toBe("BACKLOG");
    expect(i.labels).toEqual(["bug"]);
    expect((await getActivity("AIG-1")).map((a) => a.type)).toEqual(["ISSUE_CREATED"]);
  });

  it("numbers sequentially, including concurrent creates, and per project", async () => {
    const all = await Promise.all(Array.from({ length: 8 }, (_, n) => mk(`c${n}`)));
    expect(new Set(all.map((i) => i.identifier)).size).toBe(8);
    expect(all.map((i) => Number(i.identifier.split("-")[1])).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    const { createProject } = await import("@/lib/services/project-service");
    await createProject({ name: "Other", identifier: "OTH", description: "" });
    expect((await createIssue("HUMAN", { project: "OTH", title: "x" })).identifier).toBe("OTH-1");
  });

  it("rejects unknown project with helpful message and invalid input", async () => {
    await expect(createIssue("HUMAN", { project: "NOPE", title: "x" })).rejects.toThrow(/Valid identifiers: AIG/);
    await expect(createIssue("HUMAN", { project: "AIG", title: "" })).rejects.toThrow();
  });

  it("records status/priority changes and skips no-ops", async () => {
    await mk("t");
    await updateIssue("HUMAN", "AIG-1", { status: "IN_PROGRESS" });
    await updateIssue("HUMAN", "AIG-1", { status: "IN_PROGRESS" });
    await updateIssue("HUMAN", "AIG-1", { priority: "HIGH", title: "renamed" });
    const acts = await getActivity("AIG-1");
    expect(acts.map((a) => a.type)).toEqual(["ISSUE_CREATED", "STATUS_CHANGED", "PRIORITY_CHANGED"]);
    expect(acts[1]).toMatchObject({ from: "BACKLOG", to: "IN_PROGRESS" });
    expect((await getIssue("AIG-1")).title).toBe("renamed");
  });

  it("assigns to human or agent, unassigns, logs activity, rejects other values", async () => {
    await mk("t");
    expect((await updateIssue("HUMAN", "AIG-1", { assignee: "agent" })).assignee).toBe("AGENT");
    expect((await updateIssue("HUMAN", "AIG-1", { assignee: "human" })).assignee).toBe("HUMAN");
    expect((await updateIssue("HUMAN", "AIG-1", { assignee: null })).assignee).toBeNull();
    await expect(updateIssue("HUMAN", "AIG-1", { assignee: "bob" })).rejects.toThrow();
    const acts = (await getActivity("AIG-1")).filter((a) => a.type === "ASSIGNEE_CHANGED");
    expect(acts.map((a) => [a.from, a.to])).toEqual([[null, "AGENT"], ["AGENT", "HUMAN"], ["HUMAN", null]]);
  });

  it("attributes work to whoever did it", async () => {
    const i = await createIssue("AGENT", { project: "AIG", title: "by agent" });
    expect(i.createdBy).toBe("AGENT");
    await addComment("HUMAN", "AIG-1", { body: "thanks" });
    expect((await listComments("AIG-1"))[0].author).toBe("HUMAN");
    expect((await getActivity("AIG-1")).map((a) => a.actor)).toEqual(["AGENT", "HUMAN"]);
    expect((await myWork("AGENT")).map((x) => x.identifier)).toEqual([]);
  });

  it("adds/removes labels with activity, idempotently", async () => {
    await mk("t");
    await addLabel("HUMAN", "AIG-1", "api");
    await addLabel("HUMAN", "AIG-1", "api");
    expect((await getIssue("AIG-1")).labels).toEqual(["api"]);
    await removeLabel("HUMAN", "AIG-1", "api");
    expect((await getActivity("AIG-1")).map((a) => a.type)).toEqual(["ISSUE_CREATED", "LABEL_ADDED", "LABEL_REMOVED"]);
  });

  it("mirrors relations from the other side", async () => {
    await mk("a");
    await mk("b");
    await createRelation("HUMAN", "AIG-1", "BLOCKS", "AIG-2");
    expect((await getIssue("AIG-2")).relations).toMatchObject([{ type: "BLOCKED_BY", identifier: "AIG-1" }]);
    await createRelation("HUMAN", "AIG-1", "BLOCKED_BY", "AIG-2");
    expect((await getIssue("AIG-1")).relations.map((r) => r.type).sort()).toEqual(["BLOCKED_BY", "BLOCKS"]);
    await expect(createRelation("HUMAN", "AIG-1", "RELATES_TO", "AIG-1")).rejects.toThrow();
  });
});

describe("comments", () => {
  it("adds, lists in order, logs activity, rejects empty", async () => {
    await mk("t");
    await addComment("HUMAN", "AIG-1", { body: "one" });
    await addComment("AGENT", "AIG-1", { body: "**two**" });
    expect((await listComments("AIG-1")).map((c) => c.body)).toEqual(["one", "**two**"]);
    expect((await getActivity("AIG-1")).filter((a) => a.type === "COMMENT_ADDED")).toHaveLength(2);
    await expect(addComment("HUMAN", "AIG-1", { body: "  " })).rejects.toThrow();
  });
});

describe("search", () => {
  it("matches identifier, title, description, project, assignee, label and combines filters", async () => {
    await mk("Implement MCP authentication", { status: "TODO", assignee: "human", labels: ["security"] });
    await mk("Fix login redirect", { description: "cookie problem", status: "DONE" });
    const ids = async (q: Parameters<typeof searchIssues>[0]) => (await searchIssues(q)).map((i) => i.identifier).sort();
    expect(await ids({ text: "aig-2" })).toEqual(["AIG-2"]);
    expect(await ids({ text: "mcp" })).toEqual(["AIG-1"]);
    expect(await ids({ text: "cookie" })).toEqual(["AIG-2"]);
    expect(await ids({ text: "gateway" })).toEqual(["AIG-1", "AIG-2"]);
        expect(await ids({ text: "security" })).toEqual(["AIG-1"]);
    expect(await ids({ project: "AIG", status: ["TODO"], assignee: "human" })).toEqual(["AIG-1"]);
    expect(await ids({ assignee: "unassigned" })).toEqual(["AIG-2"]);
    expect(await ids({ text: "mcp login" })).toEqual([]);
  });

  it("ranks exact identifier first", async () => {
    await mk("mentions AIG-2 in title");
    await mk("other");
    expect((await searchIssues({ text: "AIG-2" }))[0].identifier).toBe("AIG-2");
  });
});
