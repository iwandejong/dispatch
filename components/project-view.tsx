"use client";

import { useEffect, useMemo, useState } from "react";
import type { Status } from "@prisma/client";
import { Columns3, List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STATUS_LABEL } from "@/lib/schemas";
import type { IssueSummary } from "@/lib/services/issue-service";
import { cn } from "@/lib/utils";
import { useApp } from "./app-context";
import { StatusDot } from "./issue-bits";
import { IssueBoard, IssueList } from "./issue-views";

type View = "board" | "list";
const STRIP: Status[] = ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

export function ProjectView({ project, issues }: { project: { identifier: string; name: string; description: string }; issues: IssueSummary[] }) {
  const { openCreate } = useApp();
  const [view, setView] = useState<View>("board");

  // Remembered per browser; read after mount to avoid a hydration mismatch.
  useEffect(() => {
    try {
      const v = localStorage.getItem("issue-view");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (v === "list" || v === "board") setView(v);
    } catch {}
  }, []);
  const pick = (v: unknown) => {
    if (v !== "board" && v !== "list") return;
    setView(v);
    try {
      localStorage.setItem("issue-view", v);
    } catch {}
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const i of issues) c[i.status] = (c[i.status] ?? 0) + 1;
    return c;
  }, [issues]);
  const open = issues.filter((i) => i.status !== "DONE" && i.status !== "CANCELLED").length;

  return (
    <div className="flex h-full flex-col">
      <header className="space-y-4 border-b px-6 pt-6 pb-4">
        <div className="flex items-center gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center border bg-muted font-mono text-xs font-semibold tracking-wider" aria-hidden>
            {project.identifier.slice(0, 3)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl leading-7 font-semibold tracking-tight">{project.name}</h1>
            <p className="font-mono text-[10px] leading-4 tracking-widest text-muted-foreground uppercase">
              {project.identifier} · {issues.length} {issues.length === 1 ? "issue" : "issues"} · {open} open
            </p>
          </div>
          <Button size="sm" onClick={() => openCreate(project.identifier)}>
            <Plus /> New issue
          </Button>
        </div>
        {project.description && <p className="max-w-2xl text-sm text-muted-foreground">{project.description}</p>}

        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {STRIP.map((s) => (
            <li key={s} className={cn("flex items-center gap-2 font-mono text-[10px] tracking-widest uppercase", !counts[s] && "opacity-40")}>
              <StatusDot status={s} className="size-2.5" />
              <span className="text-muted-foreground">{STATUS_LABEL[s]}</span>
              <span className="text-foreground">{counts[s] ?? 0}</span>
            </li>
          ))}
        </ul>
      </header>

      {issues.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-center">
          <p className="text-sm text-muted-foreground">No issues yet. Create the first one, or let your agent file it.</p>
          <Button size="sm" onClick={() => openCreate(project.identifier)}>
            <Plus /> New issue
          </Button>
          <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            or press <kbd className="border bg-muted px-1.5 py-0.5">C</kbd>
          </p>
        </div>
      ) : (
        <Tabs value={view} onValueChange={pick} className="min-h-0 flex-1 gap-0">
          <div className="border-b px-6 py-1.5">
            <TabsList variant="line">
              <TabsTrigger value="board">
                <Columns3 /> Board
              </TabsTrigger>
              <TabsTrigger value="list">
                <List /> List
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="board" className="min-h-0 overflow-auto">
            <IssueBoard issues={issues} />
          </TabsContent>
          <TabsContent value="list" className="min-h-0 overflow-auto">
            <IssueList issues={issues} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
