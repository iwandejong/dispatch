import type { Actor } from "@prisma/client";
import { db } from "@/lib/db";
import { commentInput } from "@/lib/schemas";
import { findIssue } from "./issue-service";

export async function addComment(actor: Actor, issueKey: string, raw: { body: string }) {
  const { body } = commentInput.parse(raw);
  return db.$transaction(async (tx) => {
    const issue = await findIssue(tx, issueKey);
    const c = await tx.comment.create({ data: { issueId: issue.id, author: actor, body } });
    await tx.activity.create({ data: { issueId: issue.id, actor, type: "COMMENT_ADDED" } });
    return { id: c.id, body: c.body, author: c.author, createdAt: c.createdAt };
  });
}

export async function listComments(issueKey: string) {
  const issue = await findIssue(db, issueKey);
  const rows = await db.comment.findMany({ where: { issueId: issue.id }, orderBy: { createdAt: "asc" } });
  return rows.map((c) => ({ id: c.id, body: c.body, author: c.author, createdAt: c.createdAt }));
}
