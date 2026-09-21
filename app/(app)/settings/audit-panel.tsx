import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ACTOR_LABEL } from "@/lib/schemas";
import type { listAudit } from "@/lib/services/audit-service";

type Row = Awaited<ReturnType<typeof listAudit>>[number];

export function AuditPanel({ rows }: { rows: Row[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit log</CardTitle>
        <CardDescription>Every change made from the UI or by an agent over MCP, newest first (last {rows.length}). Full request logs go to the container&apos;s stdout.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Time</TableHead><TableHead>Source</TableHead><TableHead>Actor</TableHead><TableHead>Action</TableHead><TableHead>Target</TableHead><TableHead>Result</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} title={r.error ?? undefined}>
                <TableCell className="whitespace-nowrap text-muted-foreground">{r.createdAt.toLocaleString()}</TableCell>
                <TableCell><Badge variant="outline">{r.source}</Badge></TableCell>
                <TableCell>{ACTOR_LABEL[r.actor]}</TableCell>
                <TableCell className="font-mono text-xs">{r.action}</TableCell>
                <TableCell className="font-mono text-xs">{r.target ?? "—"}</TableCell>
                <TableCell>{r.ok ? "ok" : <span className="text-destructive">{r.error?.split(":")[0] ?? "error"}</span>}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No activity yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
