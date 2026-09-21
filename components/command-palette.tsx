"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FolderKanban, Inbox, ListChecks, Plus, Settings } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command";
import { CommandDialog } from "@/components/ui/command";
import { searchAction } from "@/lib/actions";
import type { IssueSummary } from "@/lib/services/issue-service";
import { useApp } from "./app-context";
import { StatusDot } from "./issue-bits";

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const { projects, openCreate, openCreateProject, openShortcuts } = useApp();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<IssueSummary[]>([]);

  // Debounced server search; stale responses are dropped.
  useEffect(() => {
    let live = true;
    const term = q.trim();
    const t = setTimeout(async () => {
      if (!term) return live && setHits([]);
      const r = await searchAction({ text: term });
      if (live && r.ok) setHits(r.data);
    }, 120);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q]);

  const go = (fn: () => void) => {
    onOpenChange(false);
    setQ("");
    fn();
  };

  return (
    <CommandDialog open={open} onOpenChange={(o) => (onOpenChange(o), !o && setQ(""))} title="Command palette" description="Search issues or run a command">
      <Command shouldFilter={false}>
        <CommandInput placeholder="Type a command or search issues…" value={q} onValueChange={setQ} />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          {hits.length > 0 && (
            <CommandGroup heading="Issues">
              {hits.map((i) => (
                <CommandItem key={i.id} value={i.identifier} onSelect={() => go(() => router.push(`/issues/${i.identifier}`))}>
                  <StatusDot status={i.status} />
                  <span className="font-mono text-xs text-muted-foreground">{i.identifier}</span>
                  <span className="truncate">{i.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {hits.length > 0 && <CommandSeparator />}
          <CommandGroup heading="Commands">
            {[
              { l: "Create issue", i: Plus, s: "C", f: () => openCreate() },
              { l: "Create project", i: FolderKanban, f: openCreateProject },
              { l: "Go to my issues", i: ListChecks, f: () => router.push("/my-issues") },
              { l: "Go to inbox", i: Inbox, f: () => router.push("/inbox") },
              { l: "Open settings", i: Settings, f: () => router.push("/settings") },
              { l: "Show keyboard shortcuts", i: Settings, s: "?", f: openShortcuts },
            ]
              .filter((c) => !q.trim() || c.l.toLowerCase().includes(q.trim().toLowerCase()))
              .map((c) => (
                <CommandItem key={c.l} value={c.l} onSelect={() => go(c.f)}>
                  <c.i /> {c.l}
                  {c.s && <CommandShortcut>{c.s}</CommandShortcut>}
                </CommandItem>
              ))}
          </CommandGroup>
          <CommandGroup heading="Projects">
            {projects
              .filter((p) => !q.trim() || `go to ${p.name} ${p.identifier}`.toLowerCase().includes(q.trim().toLowerCase()))
              .map((p) => (
                <CommandItem key={p.id} value={`project ${p.identifier}`} onSelect={() => go(() => router.push(`/projects/${p.identifier}`))}>
                  <FolderKanban /> Go to {p.name}
                  <CommandShortcut>{p.identifier}</CommandShortcut>
                </CommandItem>
              ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
