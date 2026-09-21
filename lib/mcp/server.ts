import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { originAllowed } from "./origin";
import { registerTools } from "./tools";

/** Stateless: every request gets a fresh server + transport. Everything done here is attributed to the agent. */
export async function handleMcp(req: Request): Promise<Response> {
  if (!originAllowed(req)) {
    return Response.json({ jsonrpc: "2.0", error: { code: -32000, message: "Cross-origin requests are not allowed" }, id: null }, { status: 403 });
  }
  const server = new McpServer({ name: "dispatch", version: "1.0.0" });
  registerTools(server, "AGENT");
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  return transport.handleRequest(req);
}
