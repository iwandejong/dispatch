"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createIssueAction } from "@/lib/actions";
import { ASSIGNEE_OPTIONS, PRIORITY_LABEL } from "@/lib/schemas";
import { useApp } from "./app-context";
import { NONE, PropSelect } from "./prop-select";

const PRIORITIES = Object.entries(PRIORITY_LABEL).map(([value, label]) => ({ value, label }));

export function IssueDialog({ open, onOpenChange, defaultProject }: { open: boolean; onOpenChange: (o: boolean) => void; defaultProject?: string }) {
  const { projects } = useApp();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [project, setProject] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string | null>("NO_PRIORITY");
  const [assignee, setAssignee] = useState<string | null>(null);
  const [labels, setLabels] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setProject(defaultProject && projects.some((p) => p.identifier === defaultProject) ? defaultProject : (projects[0]?.identifier ?? null));
  }, [open, defaultProject, projects]);

  const current = projects.find((p) => p.identifier === project);

  const submit = () => {
    if (!project || !title.trim()) return;
    start(async () => {
      const r = await createIssueAction({
        project,
        title,
        description,
        priority,
        assignee,
        labels: labels.split(",").map((l) => l.trim()).filter(Boolean),
      });
      if (!r.ok) return void toast.error(r.error);
      toast.success(`Created ${r.data.identifier}`, { action: { label: "Open", onClick: () => router.push(`/issues/${r.data.identifier}`) } });
      setTitle(""); setDescription(""); setLabels(""); setAssignee(null); setPriority("NO_PRIORITY");
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl" onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && submit()}>
        <DialogHeader>
          <DialogTitle>New issue</DialogTitle>
        </DialogHeader>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">Create a project first.</p>
        ) : (
          <div className="space-y-3">
            <PropSelect value={project} onChange={setProject} options={projects.map((p) => ({ value: p.identifier, label: `${p.identifier} · ${p.name}` }))} />
            <Input autoFocus placeholder="Issue title" value={title} onChange={(e) => setTitle(e.target.value)} className="text-base font-medium" />
            <Textarea placeholder="Description (Markdown)" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} />
            <div className="flex flex-wrap gap-2">
              <PropSelect value={priority} onChange={setPriority} options={PRIORITIES} />
              <PropSelect value={assignee} onChange={setAssignee} options={[{ value: NONE, label: "Unassigned" }, ...ASSIGNEE_OPTIONS]} />
            </div>
            <Input placeholder="Labels, comma separated" value={labels} onChange={(e) => setLabels(e.target.value)} list="label-suggestions" />
            <datalist id="label-suggestions">{current?.labels.map((l) => <option key={l.id} value={l.name} />)}</datalist>
          </div>
        )}
        <DialogFooter>
          <span className="mr-auto self-center text-xs text-muted-foreground">⌘/Ctrl + Enter to create</span>
          <Button onClick={submit} disabled={pending || !title.trim() || !project}>
            {pending ? "Creating…" : "Create issue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
