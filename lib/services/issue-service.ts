import type { Actor, ActivityType, Prisma, RelationType } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError, notFound } from "@/lib/errors";
import { issueCreateInput, issuePatchInput, type IssueCreateInput, type IssuePatch } from "@/lib/schemas";
import { resolveProject } from "./project-service";

type Tx = Prisma.TransactionClient;

export const issueInclude = {
  project: { select: { id: true, identifier: true, name: true } },
  labels: { select: { id: true, name: true }, orderBy: { name: "asc" } },
} satisfies Prisma.IssueInclude;

type IssueRow = Prisma.IssueGetPayload<{ include: typeof issueInclude }>;

/** Concise, agent- and UI-friendly issue shape. */
export function toSummary(i: IssueRow) {
  return {
    id: i.id,
    identifier: `${i.project.identifier}-${i.issueNumber}`,
    title: i.title,
    status: i.status,
    priority: i.priority,
    assignee: i.assignee,
    createdBy: i.createdBy,
    project: i.project,
    labels: i.labels.map((l) => l.name),
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  };
}
export type IssueSummary = ReturnType<typeof toSummary>;

const KEY_RE = /^([A-Za-z][A-Za-z0-9]*)-(\d+)$/;

/** Find an issue row by "AIG-123" or by id. */
async function findIssue(tx: Tx, key: string) {
  const m = KEY_RE.exec(key.trim());
  const issue = m
    ? await tx.issue.findFirst({ where: { issueNumber: Number(m[2]), project: { identifier: m[1].toUpperCase() } }, include: issueInclude })
    : await tx.issue.findUnique({ where: { id: key }, include: issueInclude });
  if (!issue) throw notFound("Issue", key, "Use an identifier like AIG-123");
  return issue;
}

const log = (tx: Tx, issueId: string, actor: Actor, type: ActivityType, from?: string | null, to?: string | null) =>
  tx.activity.create({ data: { issueId, actor, type, from: from ?? null, to: to ?? null } });

async function upsertLabel(tx: Tx, projectId: string, name: string) {
  return tx.label.upsert({ where: { projectId_name: { projectId, name } }, create: { projectId, name }, update: {} });
}

export async function createIssue(actor: Actor, raw: IssueCreateInput | Record<string, unknown>) {
  const input = issueCreateInput.parse(raw);
  const project = await resolveProject(input.project);

  return db.$transaction(async (tx) => {
    // Atomic per-project counter: concurrent creates serialize on this row lock.
    const { nextIssueNumber } = await tx.project.update({
      where: { id: project.id },
      data: { nextIssueNumber: { increment: 1 } },
      select: { nextIssueNumber: true },
    });
    const labels = await Promise.all([...new Set(input.labels)].map((n) => upsertLabel(tx, project.id, n)));
    const issue = await tx.issue.create({
      data: {
        projectId: project.id,
        issueNumber: nextIssueNumber - 1,
        title: input.title,
        description: input.description,
        status: input.status,
        priority: input.priority,
        assignee: input.assignee ?? null,
        createdBy: actor,
        labels: { connect: labels.map((l) => ({ id: l.id })) },
      },
      include: issueInclude,
    });
    await log(tx, issue.id, actor, "ISSUE_CREATED");
    return toSummary(issue);
  });
}

export async function updateIssue(actor: Actor, key: string, raw: IssuePatch | Record<string, unknown>) {
  const patch = issuePatchInput.parse(raw);
  return db.$transaction(async (tx) => {
    const cur = await findIssue(tx, key);
    const data: Prisma.IssueUncheckedUpdateInput = {};
    const acts: [ActivityType, string | null, string | null][] = [];

    if (patch.title !== undefined) data.title = patch.title;
    if (patch.description !== undefined) data.description = patch.description;
    if (patch.status !== undefined && patch.status !== cur.status) {
      data.status = patch.status;
      acts.push(["STATUS_CHANGED", cur.status, patch.status]);
    }
    if (patch.priority !== undefined && patch.priority !== cur.priority) {
      data.priority = patch.priority;
      acts.push(["PRIORITY_CHANGED", cur.priority, patch.priority]);
    }
    if (patch.assignee !== undefined) {
      if (patch.assignee !== cur.assignee) {
        data.assignee = patch.assignee;
        acts.push(["ASSIGNEE_CHANGED", cur.assignee, patch.assignee]);
      }
    }

    const updated = await tx.issue.update({ where: { id: cur.id }, data, include: issueInclude });
    for (const [t, f, to] of acts) await log(tx, cur.id, actor, t, f, to);
    return toSummary(updated);
  });
}


export async function addLabel(actor: Actor, key: string, name: string) {
  const label = name.trim();
  if (!label) throw new AppError("INVALID_INPUT", "Label name required");
  return db.$transaction(async (tx) => {
    const cur = await findIssue(tx, key);
    if (cur.labels.some((l) => l.name === label)) return toSummary(cur);
    const l = await upsertLabel(tx, cur.projectId, label);
    const updated = await tx.issue.update({ where: { id: cur.id }, data: { labels: { connect: { id: l.id } } }, include: issueInclude });
    await log(tx, cur.id, actor, "LABEL_ADDED", null, label);
    return toSummary(updated);
  });
}

export async function removeLabel(actor: Actor, key: string, name: string) {
  return db.$transaction(async (tx) => {
    const cur = await findIssue(tx, key);
    const l = cur.labels.find((x) => x.name === name.trim());
    if (!l) return toSummary(cur);
    const updated = await tx.issue.update({ where: { id: cur.id }, data: { labels: { disconnect: { id: l.id } } }, include: issueInclude });
    await log(tx, cur.id, actor, "LABEL_REMOVED", l.name, null);
    return toSummary(updated);
  });
}

/** Full issue: summary + description, relations. */
export async function getIssue(key: string) {
  const cur = await findIssue(db, key);
  const [from, to, commentCount] = await Promise.all([
    db.issueRelation.findMany({ where: { fromId: cur.id }, include: { to: { include: issueInclude } } }),
    db.issueRelation.findMany({ where: { toId: cur.id }, include: { from: { include: issueInclude } } }),
    db.comment.count({ where: { issueId: cur.id } }),
  ]);
  // Stored once; BLOCKS mirrors to BLOCKED_BY when read from the other side.
  const mirror: Record<RelationType, RelationType> = { BLOCKS: "BLOCKED_BY", BLOCKED_BY: "BLOCKS", RELATES_TO: "RELATES_TO", DUPLICATES: "DUPLICATES" };
  const relations = [
    ...from.map((r) => ({ type: r.type, issue: toSummary(r.to) })),
    ...to.map((r) => ({ type: mirror[r.type], issue: toSummary(r.from) })),
  ].map((r) => ({ type: r.type, identifier: r.issue.identifier, title: r.issue.title, status: r.issue.status }));
  return { ...toSummary(cur), description: cur.description, commentCount, relations };
}

export async function createRelation(actor: Actor, key: string, type: RelationType, otherKey: string) {
  return db.$transaction(async (tx) => {
    const a = await findIssue(tx, key);
    const b = await findIssue(tx, otherKey);
    if (a.id === b.id) throw new AppError("INVALID_INPUT", "An issue cannot relate to itself");
    // Normalise BLOCKED_BY to a stored BLOCKS in the opposite direction.
    const [fromId, toId, stored] = type === "BLOCKED_BY" ? [b.id, a.id, "BLOCKS" as const] : [a.id, b.id, type];
    await tx.issueRelation.upsert({
      where: { fromId_toId_type: { fromId, toId, type: stored } },
      create: { fromId, toId, type: stored },
      update: {},
    });
        return { from: `${a.project.identifier}-${a.issueNumber}`, type, to: `${b.project.identifier}-${b.issueNumber}` };
  });
}

/** Permanently delete an issue (comments, activity and relations cascade). Returns a snapshot for the audit trail. */
export async function deleteIssue(key: string) {
  const cur = await findIssue(db, key);
  await db.issue.delete({ where: { id: cur.id } });
  return { identifier: `${cur.project.identifier}-${cur.issueNumber}`, title: cur.title, project: cur.project.identifier };
}

export async function getActivity(key: string) {
  const cur = await findIssue(db, key);
  const rows = await db.activity.findMany({
    where: { issueId: cur.id },
    orderBy: { createdAt: "asc" },
      });
  return rows.map((a) => ({ id: a.id, type: a.type, from: a.from, to: a.to, actor: a.actor, createdAt: a.createdAt }));
}

/** Issues assigned to the actor, most recently updated first. */
export async function myWork(actor: Actor, opts: { includeDone?: boolean } = {}) {
  const rows = await db.issue.findMany({
    where: { assignee: actor, ...(opts.includeDone ? {} : { status: { notIn: ["DONE", "CANCELLED"] } }) },
    include: issueInclude,
    orderBy: [{ updatedAt: "desc" }],
    take: 200,
  });
  return rows.map(toSummary);
}

/** Recent activity by the other party on issues this actor created or is assigned to. */
export async function inbox(actor: Actor) {
  const rows = await db.activity.findMany({
    where: { actor: { not: actor }, issue: { OR: [{ assignee: actor }, { createdBy: actor }] } },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { issue: { include: issueInclude } },
  });
  return rows.map((a) => ({ id: a.id, type: a.type, from: a.from, to: a.to, actor: a.actor, createdAt: a.createdAt, issue: toSummary(a.issue) }));
}

export { findIssue };
