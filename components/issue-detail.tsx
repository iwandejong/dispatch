"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EditIssueDialog } from "./edit-issue-dialog";
import { addCommentAction, addLabelAction, deleteIssueAction, removeLabelAction, updateIssueAction } from "@/lib/actions";
import { ACTOR_LABEL, ASSIGNEE_OPTIONS, PRIORITY_LABEL, STATUS_LABEL, describeActivity } from "@/lib/schemas";
import type { getActivity, getIssue } from "@/lib/services/issue-service";
import type { listComments } from "@/lib/services/comment-service";
import { useApp } from "./app-context";
import { Initials, PriorityIcon, StatusBadge } from "./issue-bits";
import { Markdown } from "./markdown";
import { NONE, PropSelect } from "./prop-select";

type Issue = Awaited<ReturnType<typeof getIssue>>;
type Comment = Awaited<ReturnType<typeof listComments>>[number];
type Activity = Awaited<ReturnType<typeof getActivity>>[number];

const when = (d: Date) => new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
export function IssueDetail({ issue, comments, activity }: { issue: Issue; comments: Comment[]; activity: Activity[] }) {
  const router = useRouter();
  const { projects } = useApp();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [comment, setComment] = useState("");
  const [label, setLabel] = useState("");

  // One path for every mutation: toast on error, refresh on success.
  const mutate = (fn: () => Promise<{ ok: boolean; error?: string }>, ok?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error);
      ok?.();
      router.refresh();
    });
  const patch = (p: Record<string, unknown>) => mutate(() => updateIssueAction(issue.identifier, p));

  return (
    <div className="mx-auto flex max-w-6xl gap-8 p-6">
      <div className="min-w-0 flex-1 space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink render={<Link href={`/projects/${issue.project.identifier}`} />}>{issue.project.name}</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage className="font-mono">{issue.identifier}</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-xl font-semibold tracking-tight">{issue.title}</h1>
            <div className="flex shrink-0 gap-1">
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)}><Pencil /> Edit</Button>
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleting(true)}><Trash2 /> Delete</Button>
            </div>
          </div>
          {issue.description ? <Markdown>{issue.description}</Markdown> : <p className="text-sm text-muted-foreground">No description.</p>}
        </div>

        <EditIssueDialog
          open={editing}
          onOpenChange={setEditing}
          identifier={issue.identifier}
          title={issue.title}
          description={issue.description}
          pending={pending}
          onSave={(v) => mutate(() => updateIssueAction(issue.identifier, v), () => setEditing(false))}
        />

        <AlertDialog open={deleting} onOpenChange={setDeleting}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {issue.identifier}?</AlertDialogTitle>
              <AlertDialogDescription>This permanently deletes the issue with its comments, activity and relations. This cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() =>
                  start(async () => {
                    const r = await deleteIssueAction(issue.identifier);
                    if (!r.ok) return void toast.error(r.error);
                    toast.success(`Deleted ${issue.identifier}`);
                    router.push(`/projects/${r.data.project}`);
                    router.refresh();
                  })
                }
              >
                Delete issue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {issue.relations.length > 0 && (
          <div className="space-y-1 text-sm">
            <h2 className="text-xs font-medium text-muted-foreground">Relations</h2>
            {issue.relations.map((r) => (
              <Link key={r.type + r.identifier} href={`/issues/${r.identifier}`} className="flex items-center gap-2 hover:underline">
                <span className="w-24 text-xs text-muted-foreground">{r.type.replace("_", " ").toLowerCase()}</span>
                <StatusBadge status={r.status} /> <span className="font-mono text-xs">{r.identifier}</span> {r.title}
              </Link>
            ))}
          </div>
        )}

        <Separator />
        <section className="space-y-3">
          <h2 className="text-sm font-medium">Comments</h2>
          {comments.map((c) => (
            <div key={c.id} className="space-y-1 rounded-none border p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Initials name={ACTOR_LABEL[c.author]} /> {ACTOR_LABEL[c.author]} · {when(c.createdAt)}</div>
              <Markdown>{c.body}</Markdown>
            </div>
          ))}
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Leave a comment (Markdown) — ⌘/Ctrl+Enter to send"
            rows={3}
            onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && comment.trim() && mutate(() => addCommentAction(issue.identifier, comment), () => setComment(""))}
          />
          <Button size="sm" disabled={pending || !comment.trim()} onClick={() => mutate(() => addCommentAction(issue.identifier, comment), () => setComment(""))}>Comment</Button>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-medium">Activity</h2>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {activity.map((a) => (
              <li key={a.id}>{when(a.createdAt)} · <span className="text-foreground">{ACTOR_LABEL[a.actor]}</span> {describeActivity(a)}</li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="hidden w-64 shrink-0 space-y-4 md:block">
        <Prop label="Status">
          <PropSelect className="w-full" value={issue.status} onChange={(v) => v && patch({ status: v })} options={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))} />
        </Prop>
        <Prop label="Priority">
          <div className="flex items-center gap-2"><PriorityIcon priority={issue.priority} />
            <PropSelect className="w-full" value={issue.priority} onChange={(v) => v && patch({ priority: v })} options={Object.entries(PRIORITY_LABEL).map(([value, label]) => ({ value, label }))} />
          </div>
        </Prop>
        <Prop label="Assignee">
          <PropSelect className="w-full" value={issue.assignee} onChange={(v) => patch({ assignee: v })} options={[{ value: NONE, label: "Unassigned" }, ...ASSIGNEE_OPTIONS]} />
        </Prop>
        <Prop label="Labels">
          <div className="flex flex-wrap items-center gap-1">
            {issue.labels.map((l) => (
              <Badge key={l} variant="outline" className="gap-1">
                {l}
                <button aria-label={`Remove ${l}`} onClick={() => mutate(() => removeLabelAction(issue.identifier, l))}><X className="size-3" /></button>
              </Badge>
            ))}
            <Popover>
              <PopoverTrigger render={<Button size="icon-xs" variant="ghost" aria-label="Add label" />}><Plus /></PopoverTrigger>
              <PopoverContent className="w-56 space-y-2 p-2" align="start">
                <form onSubmit={(e) => (e.preventDefault(), label.trim() && mutate(() => addLabelAction(issue.identifier, label.trim()), () => setLabel("")))}>
                  <Input autoFocus placeholder="Add label…" value={label} onChange={(e) => setLabel(e.target.value)} list="issue-labels" />
                  <datalist id="issue-labels">{projects.find((p) => p.id === issue.project.id)?.labels.map((l) => <option key={l.id} value={l.name} />)}</datalist>
                </form>
              </PopoverContent>
            </Popover>
          </div>
        </Prop>
        <Separator />
        <p className="text-xs text-muted-foreground">Created {when(issue.createdAt)}<br />Updated {when(issue.updatedAt)}</p>
      </aside>
    </div>
  );
}

function Prop({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}
