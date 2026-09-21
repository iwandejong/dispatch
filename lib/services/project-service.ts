import { db } from "@/lib/db";
import { AppError, notFound } from "@/lib/errors";
import { projectInput } from "@/lib/schemas";
import type { z } from "zod";

export async function resolveProject(key: string) {
  const project = await db.project.findFirst({ where: { OR: [{ id: key }, { identifier: key.toUpperCase() }] } });
  if (!project) {
    const all = await db.project.findMany({ select: { identifier: true }, take: 20 });
    throw notFound("Project", key, `Valid identifiers: ${all.map((p) => p.identifier).join(", ") || "(none)"}`);
  }
  return project;
}

export const listProjects = () =>
  db.project.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { issues: true } } },
  });

/** Project plus per-status issue counts and labels. */
export async function getProject(key: string) {
  const project = await resolveProject(key);
  const [counts, labels] = await Promise.all([
    db.issue.groupBy({ by: ["status"], where: { projectId: project.id }, _count: true }),
    db.label.findMany({ where: { projectId: project.id }, orderBy: { name: "asc" } }),
  ]);
  return { ...project, statusCounts: Object.fromEntries(counts.map((c) => [c.status, c._count])), labels };
}

export async function createProject(raw: z.input<typeof projectInput>) {
  const input = projectInput.parse(raw);
  if (await db.project.findUnique({ where: { identifier: input.identifier } }))
    throw new AppError("CONFLICT", `Project identifier "${input.identifier}" already exists`);
  return db.project.create({ data: input });
}


/** Everything the app shell needs in one round trip: projects with their labels. */
export const shellData = () =>
  db.project.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, identifier: true,
      labels: { select: { id: true, name: true }, orderBy: { name: "asc" } },
    },
  });
