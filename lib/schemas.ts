import { z } from "zod";
import { Actor, Priority, Status, RelationType } from "@prisma/client";

export const statusSchema = z.nativeEnum(Status);
export const prioritySchema = z.nativeEnum(Priority);
export const actorSchema = z.nativeEnum(Actor);
/** Accepts "human" / "agent" in any case. */
export const assigneeSchema = z.string().trim().toUpperCase().pipe(actorSchema);

export const ACTOR_LABEL: Record<Actor, string> = { HUMAN: "You", AGENT: "Agent" };
export const ASSIGNEE_OPTIONS = [
  { value: "HUMAN", label: ACTOR_LABEL.HUMAN },
  { value: "AGENT", label: ACTOR_LABEL.AGENT },
];
export const relationTypeSchema = z.nativeEnum(RelationType);

export const STATUS_LABEL: Record<Status, string> = {
  BACKLOG: "Backlog",
  TODO: "Todo",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
  CANCELLED: "Cancelled",
};
export const PRIORITY_LABEL: Record<Priority, string> = {
  NO_PRIORITY: "No priority",
  URGENT: "Urgent",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

const text = (max: number) => z.string().trim().min(1).max(max);

export const projectInput = z.object({
  name: text(80),
  identifier: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9]{1,9}$/, "2-10 chars, letters/digits, starting with a letter"),
  description: z.string().max(5000).default(""),
});

export const issueCreateInput = z.object({
  project: text(80).describe("Project identifier (e.g. AIG) or id"),
  title: text(300),
  description: z.string().max(50000).default(""),
  status: statusSchema.default("BACKLOG"),
  priority: prioritySchema.default("NO_PRIORITY"),
  assignee: assigneeSchema.nullish().describe('"human" or "agent"'),
  labels: z.array(text(50)).max(20).default([]),
});

export const issuePatchInput = z.object({
  title: text(300).optional(),
  description: z.string().max(50000).optional(),
  status: statusSchema.optional(),
  priority: prioritySchema.optional(),
  assignee: assigneeSchema.nullable().optional().describe('"human" or "agent"; null to unassign'),
});

export const searchInput = z.object({
  text: z.string().trim().max(200).optional(),
  project: z.string().trim().optional(),
  status: z.array(statusSchema).optional(),
  priority: z.array(prioritySchema).optional(),
  assignee: z.string().trim().toLowerCase().pipe(z.enum(["human", "agent", "unassigned"])).optional(),
  label: z.string().trim().optional(),
  limit: z.number().int().min(1).max(200).default(50),
});

export const commentInput = z.object({ body: text(20000) });

export type IssueCreateInput = z.infer<typeof issueCreateInput>;
export type IssuePatch = z.infer<typeof issuePatchInput>;
export type SearchInput = z.infer<typeof searchInput>;

/** Human-readable activity line, e.g. "assignee changed: none → Agent". */
export function describeActivity(a: { type: string; from: string | null; to: string | null }) {
  const t = a.type.replace(/_/g, " ").toLowerCase();
  if (!a.from && !a.to) return t;
  const v = (x: string | null) => (x === null ? "none" : a.type === "ASSIGNEE_CHANGED" ? (ACTOR_LABEL[x as Actor] ?? x) : x);
  return `${t}: ${v(a.from)} → ${v(a.to)}`;
}
