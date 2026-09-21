import type { Priority, Status } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PRIORITY_LABEL, STATUS_LABEL } from "@/lib/schemas";

// One shared map of label + classes per discrete state. Red = urgent, amber = in progress,
// blue = in review/processing, green = done, neutral = inactive. Add colours here, not at call sites.
const NEUTRAL = "border-border text-muted-foreground";
export const STATUS_STYLE: Record<Status, { badge: string; dot: string }> = {
  BACKLOG: { badge: NEUTRAL, dot: "border-muted-foreground/60" },
  TODO: { badge: "border-border text-foreground", dot: "border-foreground/60" },
  IN_PROGRESS: { badge: "border-amber-500/30 text-amber-600 dark:text-amber-400", dot: "border-amber-500 bg-amber-500/30" },
  IN_REVIEW: { badge: "border-blue-500/30 text-blue-600 dark:text-blue-400", dot: "border-blue-500 bg-blue-500/30" },
  DONE: { badge: "border-emerald-500/30 text-emerald-600 dark:text-emerald-400", dot: "border-emerald-500 bg-emerald-500" },
  CANCELLED: { badge: NEUTRAL, dot: "border-muted-foreground/60 bg-muted-foreground/30" },
};

export const PRIORITY_STYLE: Record<Priority, { label: string; bars: number; text: string }> = {
  NO_PRIORITY: { label: PRIORITY_LABEL.NO_PRIORITY, bars: 0, text: "text-muted-foreground" },
  LOW: { label: PRIORITY_LABEL.LOW, bars: 1, text: "text-muted-foreground" },
  MEDIUM: { label: PRIORITY_LABEL.MEDIUM, bars: 2, text: "text-foreground" },
  HIGH: { label: PRIORITY_LABEL.HIGH, bars: 3, text: "text-amber-600 dark:text-amber-400" },
  URGENT: { label: PRIORITY_LABEL.URGENT, bars: 4, text: "text-red-600 dark:text-red-400" },
};

// Status dots are circles by meaning, so they keep rounded-full.
export function StatusDot({ status, className }: { status: Status; className?: string }) {
  return <span title={STATUS_LABEL[status]} className={cn("inline-block size-3 shrink-0 rounded-full border-2", STATUS_STYLE[status].dot, className)} />;
}

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <Badge variant="outline" className={cn(STATUS_STYLE[status].badge, className)}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export function PriorityIcon({ priority, className }: { priority: Priority; className?: string }) {
  const { bars, text, label } = PRIORITY_STYLE[priority];
  return (
    <span title={label} className={cn("inline-flex h-3 items-end gap-px", text, className)}>
      {[1, 2, 3, 4].map((b) => (
        <span key={b} style={{ height: `${b * 25}%` }} className={cn("w-[3px] bg-current", b > bars && "opacity-25")} />
      ))}
    </span>
  );
}

// Avatars are circles by meaning.
export function Initials({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn("inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-[10px] font-medium", className)}>
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}
