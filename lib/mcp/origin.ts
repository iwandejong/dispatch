/**
 * The MCP endpoint has no credentials, so refuse requests that come from a web page on another
 * origin (CSRF / DNS-rebinding style). Non-browser MCP clients send no Origin header and pass.
 */
export function originAllowed(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}
