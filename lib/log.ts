// Structured JSON logs to stdout (one line per event). No files, no network.
const SECRET = /pass(word)?|token|secret|authorization|cookie|hash/i;

/** Redact secret-looking keys and truncate long strings, recursively. */
export function sanitize(v: unknown, depth = 0): unknown {
  if (typeof v === "string") return v.length > 200 ? `${v.slice(0, 200)}…(${v.length} chars)` : v;
  if (v === null || typeof v !== "object") return v;
  if (depth > 3) return "[nested]";
  if (Array.isArray(v)) return v.slice(0, 20).map((x) => sanitize(x, depth + 1));
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, SECRET.test(k) ? "[redacted]" : sanitize(x, depth + 1)]));
}

export function log(level: "info" | "warn" | "error", msg: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, msg, ...(sanitize(fields) as object) });
  (level === "error" ? console.error : console.log)(line);
}
