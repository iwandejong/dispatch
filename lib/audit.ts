import { randomUUID } from "node:crypto";
import type { Actor, Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { log, sanitize } from "@/lib/log";
import { writeAudit } from "@/lib/services/audit-service";

type Ctx = { source: "ui" | "mcp"; action: string; actor: Actor; args?: unknown; read?: boolean };

const targetOf = (args: unknown): string | undefined => {
  if (!args || typeof args !== "object") return undefined;
  const a = args as Record<string, unknown>;
  const t = a.issue ?? a.key ?? a.project ?? a.name;
  return typeof t === "string" ? t : undefined;
};

/**
 * Runs `fn`, then logs a JSON line and (for mutations) stores an AuditLog row.
 * Failures are recorded and rethrown. Audit-write errors never break the request.
 * ponytail: audit row is written after the operation, not in its transaction; wrap in one if you need atomic audit.
 */
export async function withAudit<T>(ctx: Ctx, fn: () => Promise<T>): Promise<T> {
  const requestId = randomUUID().slice(0, 8);
  const start = Date.now();
  let error: string | undefined;
  try {
    return await fn();
  } catch (e) {
    error = e instanceof AppError ? e.toString() : e instanceof Error && e.name === "ZodError" ? "INVALID_INPUT" : "INTERNAL";
    throw e;
  } finally {
    const durationMs = Date.now() - start;
    const target = targetOf(ctx.args);
    const ok = !error;
    log(ok ? "info" : "warn", ctx.action, { requestId, source: ctx.source, actor: ctx.actor, target, ok, error, durationMs });
    if (!ctx.read || !ok) {
      // Failed reads are recorded too; successful reads stay in stdout only.
      await writeAudit({
        requestId, actor: ctx.actor, source: ctx.source, action: ctx.action, target, ok, error, durationMs,
        meta: sanitize(ctx.args ?? {}) as Prisma.InputJsonValue,
      }).catch((e) => log("error", "audit write failed", { requestId, error: e instanceof Error ? e.message : "unknown" }));
    }
  }
}
