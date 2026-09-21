import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { searchInput, type SearchInput } from "@/lib/schemas";
import { issueInclude, toSummary } from "./issue-service";
import { resolveProject } from "./project-service";

const KEY_RE = /^([A-Za-z][A-Za-z0-9]*)-(\d+)$/;
const ci = (q: string) => ({ contains: q, mode: "insensitive" as const });

/** One filter+text search used by the UI list, command palette and MCP. */
export async function searchIssues(raw: Partial<SearchInput> = {}) {
  const f = searchInput.parse(raw);
  const and: Prisma.IssueWhereInput[] = [];

  if (f.project) and.push({ projectId: (await resolveProject(f.project)).id });
  if (f.status?.length) and.push({ status: { in: f.status } });
  if (f.priority?.length) and.push({ priority: { in: f.priority } });
  if (f.assignee) and.push({ assignee: f.assignee === "unassigned" ? null : (f.assignee.toUpperCase() as "HUMAN" | "AGENT") });
  if (f.label) and.push({ labels: { some: { name: { equals: f.label, mode: "insensitive" } } } });

  const terms = (f.text ?? "").split(/\s+/).filter(Boolean);
  for (const t of terms) {
    const m = KEY_RE.exec(t);
    and.push({
      OR: [
        ...(m ? [{ issueNumber: Number(m[2]), project: { identifier: m[1].toUpperCase() } }] : []),
        { title: ci(t) },
        { description: ci(t) },
        { project: { name: ci(t) } },
        { project: { identifier: ci(t) } },
        { labels: { some: { name: ci(t) } } },
      ],
    });
  }

  const rows = await db.issue.findMany({
    where: { AND: and },
    include: issueInclude,
    orderBy: { updatedAt: "desc" },
    take: Math.min(f.limit * 3, 500),
  });

  // Rank: exact identifier > title hit > everything else; recency breaks ties (already ordered).
  const q = (f.text ?? "").trim().toLowerCase();
  const rank = (r: (typeof rows)[number]) =>
    `${r.project.identifier}-${r.issueNumber}`.toLowerCase() === q ? 0 : q && r.title.toLowerCase().includes(q) ? 1 : 2;
  return rows
    .map((r, i) => ({ r, i, k: rank(r) }))
    .sort((a, b) => a.k - b.k || a.i - b.i)
    .slice(0, f.limit)
    .map(({ r }) => toSummary(r));
}
