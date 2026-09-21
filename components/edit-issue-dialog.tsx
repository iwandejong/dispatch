"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** All issue text edits go through this shadcn Dialog. */
export function EditIssueDialog({
  open,
  onOpenChange,
  identifier,
  title: initialTitle,
  description: initialDescription,
  pending,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  identifier: string;
  title: string;
  description: string;
  pending: boolean;
  onSave: (v: { title: string; description: string }) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Content unmounts when closed, so the form state re-initialises from props on every open. */}
      <EditForm identifier={identifier} title={initialTitle} description={initialDescription} pending={pending} onSave={onSave} onCancel={() => onOpenChange(false)} />
    </Dialog>
  );
}

function EditForm({ identifier, title: t0, description: d0, pending, onSave, onCancel }: { identifier: string; title: string; description: string; pending: boolean; onSave: (v: { title: string; description: string }) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(t0);
  const [description, setDescription] = useState(d0);
  return (
      <DialogContent className="sm:max-w-xl" onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && title.trim() && onSave({ title, description })}>
        <DialogHeader>
          <DialogTitle>Edit {identifier}</DialogTitle>
          <DialogDescription>Status, priority, assignee and labels are edited from the side panel.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-title">Title</Label>
            <Input id="edit-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-desc">Description</Label>
            <Textarea id="edit-desc" rows={10} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Markdown supported" />
          </div>
        </div>
        <DialogFooter>
          <span className="mr-auto self-center text-xs text-muted-foreground">⌘/Ctrl + Enter to save</span>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button disabled={pending || !title.trim()} onClick={() => onSave({ title, description })}>Save</Button>
        </DialogFooter>
      </DialogContent>
  );
}
