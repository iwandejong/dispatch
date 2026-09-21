"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { withAudit } from "@/lib/audit";
import * as projects from "@/lib/services/project-service";
import * as issues from "@/lib/services/issue-service";
import * as comments from "@/lib/services/comment-service";
import { searchIssues } from "@/lib/services/search-service";
import type { IssueSummary } from "@/lib/services/issue-service";
import type { SearchInput } from "@/lib/schemas";

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

/** Everything done through the UI is attributed to the human. Errors become toast text. */
async function run<T>(action: string, args: unknown, fn: () => Promise<T>, read = false): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await withAudit({ source: "ui", action, actor: "HUMAN", args, read }, fn) };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.message };
    if (e instanceof z.ZodError) return { ok: false, error: e.issues.map((i) => `${i.path.join(".")}: ${i.message}`.replace(/^: /, "")).join("; ") };
    console.error("action failed:", e instanceof Error ? e.message : "unknown");
    return { ok: false, error: "Something went wrong" };
  }
}

const refresh = () => revalidatePath("/", "layout");

export const createProjectAction = async (input: Parameters<typeof projects.createProject>[0]) =>
  run("project.create", input, async () => {
    const p = await projects.createProject(input);
    refresh();
    return { identifier: p.identifier };
  });

export const createIssueAction = async (input: Record<string, unknown>) =>
  run("issue.create", input, async () => {
    const i = await issues.createIssue("HUMAN", input);
    refresh();
    return { identifier: i.identifier };
  });

export const updateIssueAction = async (key: string, patch: Record<string, unknown>) =>
  run("issue.update", { key, ...patch }, async () => (await issues.updateIssue("HUMAN", key, patch), refresh(), null));

export const deleteIssueAction = async (key: string) =>
  run("issue.delete", { key }, async () => {
    const r = await issues.deleteIssue(key);
    refresh();
    return { project: r.project };
  });

export const addLabelAction = async (key: string, label: string) => run("issue.label_add", { key, label }, async () => (await issues.addLabel("HUMAN", key, label), refresh(), null));
export const removeLabelAction = async (key: string, label: string) => run("issue.label_remove", { key, label }, async () => (await issues.removeLabel("HUMAN", key, label), refresh(), null));

export const addCommentAction = async (key: string, body: string) => run("comment.add", { key, body }, async () => (await comments.addComment("HUMAN", key, { body }), refresh(), null));

export const searchAction = async (input: Partial<SearchInput>): Promise<ActionResult<IssueSummary[]>> => run("search", input, () => searchIssues({ limit: 12, ...input }), true);
