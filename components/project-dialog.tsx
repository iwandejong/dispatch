"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createProjectAction } from "@/lib/actions";

export function ProjectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Content unmounts when closed, so the form starts empty on every open. */}
      <ProjectForm onDone={() => onOpenChange(false)} />
    </Dialog>
  );
}

// Suggest an identifier from the initials of the name until the user edits it.
const suggest = (n: string) =>
  n.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 4).toUpperCase();

function ProjectForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [description, setDescription] = useState("");
  const [touched, setTouched] = useState(false);
  const valid = name.trim() && identifier.length >= 2;

  const submit = () =>
    valid &&
    start(async () => {
      const r = await createProjectAction({ name, identifier, description });
      if (!r.ok) return void toast.error(r.error);
      toast.success(`Created ${identifier}`);
      onDone();
      router.push(`/projects/${r.data.identifier}`);
      router.refresh();
    });

  return (
    <DialogContent className="sm:max-w-md" onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && submit()}>
      <DialogHeader>
        <DialogTitle>New project</DialogTitle>
        <DialogDescription>The identifier prefixes issue numbers, e.g. AIG-123.</DialogDescription>
      </DialogHeader>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="np-name">Name</Label>
          <Input id="np-name" autoFocus placeholder="AI Gateway" value={name} onChange={(e) => (setName(e.target.value), !touched && setIdentifier(suggest(e.target.value)))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="np-id">Identifier</Label>
          <Input id="np-id" placeholder="AIG" maxLength={10} value={identifier} className="uppercase" onChange={(e) => (setTouched(true), setIdentifier(e.target.value.toUpperCase()))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="np-desc">Description</Label>
          <Textarea id="np-desc" rows={3} placeholder="Optional" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <DialogFooter className="-mx-4 -mb-4">
          <span className="mr-auto self-center text-xs text-muted-foreground">⌘/Ctrl + Enter to create</span>
          <Button type="submit" disabled={pending || !valid}>
            {pending ? "Creating…" : "Create project"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
