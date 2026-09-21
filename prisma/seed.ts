// DEVELOPMENT ONLY. Creates an example project with issues.
// Refuses to run in production unless SEED_DEMO=true.
import { PrismaClient } from "@prisma/client";
import { createProject } from "../lib/services/project-service";
import { createIssue, updateIssue } from "../lib/services/issue-service";

const db = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.SEED_DEMO !== "true") {
    console.error("Refusing to seed demo data in production (set SEED_DEMO=true to override).");
    process.exit(1);
  }
  if (await db.project.findUnique({ where: { identifier: "AIG" } })) return console.log("Seed data already present.");

  const actor = "HUMAN" as const;
  await createProject({ name: "AI Gateway", identifier: "AIG", description: "Routing, auth and observability for internal LLM traffic." });

  const seed = [
    { title: "Implement MCP authentication", status: "IN_PROGRESS", priority: "HIGH", labels: ["security"], assignee: "human", description: "Static bearer token via `MCP_API_TOKEN`.\n\n- [ ] constant-time compare\n- [ ] never log token" },
    { title: "Add request tracing to gateway", status: "TODO", priority: "MEDIUM", labels: ["observability"], assignee: "agent" },
    { title: "Rate limit per API key", status: "BACKLOG", priority: "LOW", labels: ["api"] },
    { title: "Fix streaming timeout on long completions", status: "IN_REVIEW", priority: "URGENT", labels: ["bug"], assignee: "human" },
    { title: "Document deployment topology", status: "DONE", priority: "LOW", labels: ["docs"] },
    { title: "Model fallback configuration", status: "TODO", priority: "HIGH", labels: ["api"] },
    { title: "Prometheus metrics endpoint", status: "BACKLOG", priority: "NO_PRIORITY", labels: ["observability"] },
    { title: "Drop legacy v1 routes", status: "CANCELLED", priority: "NO_PRIORITY" },
  ] as const;
  for (const { status, ...s } of seed) {
    const i = await createIssue(actor, { project: "AIG", ...s });
    if (status !== "BACKLOG") await updateIssue(actor, i.identifier, { status });
  }
  console.log("Seeded example project AIG.");
}

main().finally(() => db.$disconnect());
