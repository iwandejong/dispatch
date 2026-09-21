"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import type { Priority, Status } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { ACTOR_LABEL, ASSIGNEE_OPTIONS, PRIORITY_LABEL, STATUS_LABEL } from "@/lib/schemas";
import { updateIssueAction } from "@/lib/actions";
import { cn } from "@/lib/utils";
import type { IssueSummary } from "@/lib/services/issue-service";
import { Initials, PriorityIcon, StatusDot } from "./issue-bits";
import { NONE, PropSelect } from "./prop-select";

const ago = (d: Date | string) => {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  return s < 3600 ? `${Math.max(1, Math.round(s / 60))}m` : s < 86400 ? `${Math.round(s / 3600)}h` : `${Math.round(s / 86400)}d`;
};

export function IssueRow({ issue }: { issue: IssueSummary }) {
  return (
    <Link href={`/issues/${issue.identifier}`} className="flex items-center gap-3 border-b px-4 py-2 text-sm hover:bg-accent/50">
      <PriorityIcon priority={issue.priority} />
      <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{issue.identifier}</span>
      <StatusDot status={issue.status} />
      <span className="min-w-0 flex-1 truncate">{issue.title}</span>
      {issue.labels.slice(0, 3).map((l) => (
        <Badge key={l} variant="outline" className="hidden sm:inline-flex">{l}</Badge>
      ))}
      {issue.assignee ? <Initials name={ACTOR_LABEL[issue.assignee]} /> : <span className="size-5" />}
      <span className="w-8 text-right text-xs text-muted-foreground">{ago(issue.updatedAt)}</span>
    </Link>
  );
}

type Sort = "updated" | "created" | "priority" | "status";
const PRIORITY_ORDER: Priority[] = ["URGENT", "HIGH", "MEDIUM", "LOW", "NO_PRIORITY"];
const STATUS_ORDER: Status[] = ["IN_PROGRESS", "IN_REVIEW", "TODO", "BACKLOG", "DONE", "CANCELLED"];
const all = (label: string) => ({ value: NONE, label });

export function IssueList({ issues }: { issues: IssueSummary[] }) {
  const [status, setStatus] = useState<string | null>(null);
  const [priority, setPriority] = useState<string | null>(null);
  const [assignee, setAssignee] = useState<string | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [sort, setSort] = useState<string | null>("updated");

  const opts = useMemo(() => {
    const uniq = <T,>(xs: (T | undefined)[]) => [...new Set(xs.filter((x): x is T => x !== undefined))];
    return {
      labels: uniq(issues.flatMap((i) => i.labels)),
    };
  }, [issues]);

  const rows = useMemo(() => {
    const f = issues.filter(
      (i) =>
        (!status || i.status === status) &&
        (!priority || i.priority === priority) &&
        (!assignee || (assignee === "__unassigned" ? !i.assignee : i.assignee === assignee)) &&
        (!label || i.labels.includes(label)),
    );
    const key: Record<Sort, (a: IssueSummary, b: IssueSummary) => number> = {
      updated: (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt),
      created: (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
      priority: (a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority),
      status: (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
    };
    return [...f].sort(key[(sort ?? "updated") as Sort]);
  }, [issues, status, priority, assignee, label, sort]);

  const w = "w-36";
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
        <PropSelect className={w} value={status} onChange={setStatus} options={[all("Any status"), ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))]} />
        <PropSelect className={w} value={priority} onChange={setPriority} options={[all("Any priority"), ...Object.entries(PRIORITY_LABEL).map(([value, label]) => ({ value, label }))]} />
        <PropSelect className={w} value={assignee} onChange={setAssignee} options={[all("Any assignee"), { value: "__unassigned", label: "Unassigned" }, ...ASSIGNEE_OPTIONS]} />
        <PropSelect className={w} value={label} onChange={setLabel} options={[all("Any label"), ...opts.labels.map((l) => ({ value: l, label: l }))]} />
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          Sort
          <PropSelect className="w-32" value={sort} onChange={setSort} options={[{ value: "updated", label: "Updated" }, { value: "created", label: "Created" }, { value: "priority", label: "Priority" }, { value: "status", label: "Status" }]} />
        </div>
      </div>
      {rows.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No issues match.</p> : rows.map((i) => <IssueRow key={i.id} issue={i} />)}
    </div>
  );
}

const BOARD: Status[] = ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

export function IssueBoard({ issues }: { issues: IssueSummary[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [over, setOver] = useState<Status | null>(null);
  const [optimistic, move] = useOptimistic(issues, (s, m: { id: string; status: Status }) => s.map((i) => (i.id === m.id ? { ...i, status: m.status } : i)));

  const drop = (status: Status, id: string) => {
    const issue = issues.find((i) => i.id === id);
    if (!issue || issue.status === status) return;
    start(async () => {
      move({ id, status });
      const r = await updateIssueAction(issue.identifier, { status });
      if (!r.ok) toast.error(r.error);
      router.refresh();
    });
  };

  return (
    <div className="flex h-full gap-3 overflow-x-auto p-4">
      {BOARD.map((s) => {
        const col = optimistic.filter((i) => i.status === s);
        return (
          <section
            key={s}
            onDragOver={(e) => (e.preventDefault(), setOver(s))}
            onDragLeave={() => setOver((o) => (o === s ? null : o))}
            onDrop={(e) => (setOver(null), drop(s, e.dataTransfer.getData("text/plain")))}
            className={cn("flex w-72 shrink-0 flex-col rounded-none bg-muted/40 p-2", over === s && "ring-2 ring-ring/40")}
          >
            <h3 className="flex items-center gap-2 px-1 pb-2 text-xs font-medium">
              <StatusDot status={s} /> {STATUS_LABEL[s]} <span className="text-muted-foreground">{col.length}</span>
            </h3>
            <div className="space-y-2 overflow-y-auto">
              {col.map((i) => (
                <Link
                  key={i.id}
                  href={`/issues/${i.identifier}`}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", i.id)}
                  className="block cursor-grab rounded-none border bg-card p-2.5 text-sm shadow-xs hover:border-foreground/20 active:cursor-grabbing"
                >
                  <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <PriorityIcon priority={i.priority} /> <span className="font-mono">{i.identifier}</span>
                    {i.assignee && <Initials name={ACTOR_LABEL[i.assignee]} className="ml-auto" />}
                  </div>
                  <div className="line-clamp-2">{i.title}</div>
                  {i.labels.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {i.labels.map((l) => <Badge key={l} variant="outline">{l}</Badge>)}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
