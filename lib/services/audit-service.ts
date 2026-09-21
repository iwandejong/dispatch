import type { Actor, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type AuditEntry = {
  requestId: string;
  actor: Actor;
  source: "ui" | "mcp";
  action: string;
  target?: string | null;
  ok: boolean;
  error?: string | null;
  meta?: Prisma.InputJsonValue;
  durationMs: number;
};

export const writeAudit = (e: AuditEntry) => db.auditLog.create({ data: { ...e, target: e.target ?? null, error: e.error ?? null } });

export const listAudit = (opts: { limit?: number } = {}) =>
  db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: Math.min(opts.limit ?? 100, 500) });
