import { handleMcp } from "@/lib/mcp/server";

export const POST = handleMcp;
// Stateless server: no server-initiated SSE stream and no sessions to close.
const notAllowed = () => new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
export const GET = notAllowed;
export const DELETE = notAllowed;
