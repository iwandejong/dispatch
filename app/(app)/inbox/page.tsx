import Link from "next/link";
import { inbox } from "@/lib/services/issue-service";
import { ACTOR_LABEL, describeActivity } from "@/lib/schemas";
import { StatusBadge } from "@/components/issue-bits";

export default async function Inbox() {
  const items = await inbox("HUMAN");
  return (
    <div>
      <h1 className="border-b px-4 py-3 text-lg font-semibold tracking-tight">Inbox</h1>
      {items.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Nothing new. Changes the agent makes to issues you created or own show up here.</p>}
      {items.map((a) => (
        <Link key={a.id} href={`/issues/${a.issue.identifier}`} className="flex items-center gap-3 border-b px-4 py-2.5 text-sm hover:bg-accent/50">
          <StatusBadge status={a.issue.status} className="w-24" />
          <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{a.issue.identifier}</span>
          <span className="min-w-0 flex-1 truncate">{a.issue.title}</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">{ACTOR_LABEL[a.actor]} · {describeActivity(a)}</span>
          <span className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</span>
        </Link>
      ))}
    </div>
  );
}
