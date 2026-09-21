"use client";

import { createContext, useContext } from "react";

export type ShellProject = { id: string; name: string; identifier: string; labels: { id: string; name: string }[] };

export type AppCtx = {
  projects: ShellProject[];
  openCreate: (projectIdentifier?: string) => void;
  openCreateProject: () => void;
  openPalette: () => void;
  openShortcuts: () => void;
};

export const AppContext = createContext<AppCtx | null>(null);
export const useApp = () => {
  const c = useContext(AppContext);
  if (!c) throw new Error("useApp outside AppShell");
  return c;
};
