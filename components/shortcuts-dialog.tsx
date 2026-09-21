"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SHORTCUTS: [string, string][] = [
  ["⌘/Ctrl K", "Command palette"],
  ["C", "Create issue"],
  ["/", "Search issues"],
  ["[", "Collapse / expand sidebar"],
  ["?", "Show this help"],
  ["⌘/Ctrl Enter", "Submit create-issue dialog"],
  ["Esc", "Close dialog"],
];

export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <dl className="space-y-2 text-sm">
          {SHORTCUTS.map(([k, d]) => (
            <div key={k} className="flex items-center justify-between">
              <dt className="text-muted-foreground">{d}</dt>
              <dd>
                <kbd className="rounded-none border bg-muted px-1.5 py-0.5 font-mono text-xs">{k}</kbd>
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted-foreground">Single-key shortcuts are disabled while typing in a field.</p>
      </DialogContent>
    </Dialog>
  );
}
