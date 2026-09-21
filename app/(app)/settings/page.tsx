import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listAudit } from "@/lib/services/audit-service";
import { AuditPanel } from "./audit-panel";

export default async function Settings() {
  const audit = await listAudit();
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Two actors use this tracker: you, and your coding agent over MCP.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Connect your agent</CardTitle>
          <CardDescription>Point any MCP client at this endpoint (Streamable HTTP). Everything it does is recorded as “Agent”.</CardDescription>
        </CardHeader>
        <CardContent>
          <code className="block border bg-muted px-3 py-2 font-mono text-xs">http://localhost:3000/mcp</code>
        </CardContent>
      </Card>
      <AuditPanel rows={audit} />
    </div>
  );
}
