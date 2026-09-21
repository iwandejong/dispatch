"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Inbox, ListChecks, PanelLeft, Plus, Search, Settings, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { AppContext, type ShellProject } from "./app-context";
import { CommandPalette } from "./command-palette";
import { IssueDialog } from "./issue-dialog";
import { ProjectDialog } from "./project-dialog";
import { ShortcutsDialog } from "./shortcuts-dialog";

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
};

export function AppShell({ projects, children }: { projects: ShellProject[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [palette, setPalette] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [projectDialog, setProjectDialog] = useState(false);
  const [create, setCreate] = useState<{ open: boolean; project?: string }>({ open: false });

  // Sidebar preference lives in localStorage (per browser). Read after mount to avoid hydration mismatch.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(localStorage.getItem("sidebar-collapsed") === "1");
    } catch {}
  }, []);
  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem("sidebar-collapsed", c ? "0" : "1");
      } catch {}
      return !c;
    });

  const openCreate = useCallback((project?: string) => setCreate({ open: true, project }), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        return setPalette((o) => !o);
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (document.querySelector('[role="dialog"]')) return; // a dialog is open
      if (e.key === "c") {
        e.preventDefault();
        openCreate(pathname.startsWith("/projects/") ? pathname.split("/")[2] : undefined);
      } else if (e.key === "/") {
        e.preventDefault();
        setPalette(true);
      } else if (e.key === "?") setShortcuts(true);
      else if (e.key === "[") toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pathname, openCreate]);

  const nav = [
    { href: "/inbox", label: "Inbox", icon: Inbox },
    { href: "/my-issues", label: "My Issues", icon: ListChecks },
  ];
  const link = (href: string, active: boolean) =>
    cn("flex w-full items-center gap-2 rounded-none px-2 py-1.5 font-mono text-xs tracking-wider text-muted-foreground uppercase hover:bg-accent hover:text-foreground", active && "bg-accent text-foreground", collapsed && "justify-center px-0");

  return (
    <AppContext.Provider value={{ projects, openCreate, openCreateProject: () => setProjectDialog(true), openPalette: () => setPalette(true), openShortcuts: () => setShortcuts(true) }}>
      <div className="flex h-screen overflow-hidden">
        <aside className={cn("flex shrink-0 flex-col border-r bg-sidebar transition-[width]", collapsed ? "w-12" : "w-56")}>
          <div className={cn("flex h-11 items-center px-2", collapsed ? "justify-center" : "justify-between")}>
            {!collapsed && (
              <span className="px-1.5 font-mono text-xs font-semibold tracking-widest uppercase">Dispatch</span>
            )}
            <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label="Toggle sidebar" title="Toggle sidebar ([)">
              <PanelLeft />
            </Button>
          </div>

          <div className="space-y-0.5 px-2">
            <button onClick={() => openCreate()} className={link("", false)} title="Create issue (C)">
              <Plus className="size-4" /> {!collapsed && <span>New issue</span>}
            </button>
            <button onClick={() => setPalette(true)} className={link("", false)} title="Search (/)">
              <Search className="size-4" /> {!collapsed && <span>Search</span>}
            </button>
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className={link(n.href, pathname === n.href)} title={n.label}>
                <n.icon className="size-4" /> {!collapsed && n.label}
              </Link>
            ))}
          </div>

          <ScrollArea className="mt-3 min-h-0 flex-1 px-2">
            {!collapsed && <div className="px-2 pb-1 font-mono text-[10px] font-medium tracking-widest text-muted-foreground uppercase">Projects</div>}
            <div className="space-y-0.5">
              {projects.map((p) => (
                <Link key={p.id} href={`/projects/${p.identifier}`} title={p.name} className={link("", pathname.startsWith(`/projects/${p.identifier}`))}>
                  <span className="inline-flex size-4 items-center justify-center rounded-none bg-muted text-[9px] font-semibold">{p.identifier.slice(0, 2)}</span>
                  {!collapsed && <span className="truncate">{p.name}</span>}
                </Link>
              ))}
              {!collapsed && (
                <button onClick={() => setProjectDialog(true)} className="flex w-full items-center gap-2 px-2 py-1.5 font-mono text-xs tracking-wider text-muted-foreground uppercase hover:text-foreground">
                  <Plus className="size-3.5" /> New project
                </button>
              )}
            </div>
          </ScrollArea>

          <Separator />
          <div className="space-y-0.5 p-2">
            <button onClick={() => setShortcuts(true)} className={link("", false)} title="Keyboard shortcuts (?)">
              <Keyboard className="size-4" /> {!collapsed && "Shortcuts"}
            </button>
            <Link href="/settings" className={link("/settings", pathname === "/settings")} title="Settings">
              <Settings className="size-4" /> {!collapsed && "Settings"}
            </Link>
          </div>
        </aside>
        <main className="min-w-0 flex-1 overflow-auto">{children}</main>
      </div>

      <CommandPalette open={palette} onOpenChange={setPalette} />
      <IssueDialog open={create.open} defaultProject={create.project} onOpenChange={(o) => setCreate((c) => ({ ...c, open: o }))} />
      <ProjectDialog open={projectDialog} onOpenChange={setProjectDialog} />
      <ShortcutsDialog open={shortcuts} onOpenChange={setShortcuts} />
    </AppContext.Provider>
  );
}
