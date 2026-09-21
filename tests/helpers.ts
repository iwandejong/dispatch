import { db } from "@/lib/db";
import { createProject } from "@/lib/services/project-service";

export async function reset() {
  await db.$transaction([
    db.auditLog.deleteMany(),
    db.activity.deleteMany(),
    db.comment.deleteMany(),
    db.issueRelation.deleteMany(),
    db.issue.deleteMany(),
    db.label.deleteMany(),
    db.project.deleteMany(),
  ]);
}

export async function fixture() {
  await reset();
  const project = await createProject({ name: "AI Gateway", identifier: "AIG", description: "" });
  return { project };
}
