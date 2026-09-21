export type ErrorCode = "NOT_FOUND" | "INVALID_INPUT" | "CONFLICT";

const HTTP: Record<ErrorCode, number> = {
  NOT_FOUND: 404,
  INVALID_INPUT: 400,
  CONFLICT: 409,
};

export class AppError extends Error {
  readonly status: number;
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.status = HTTP[code];
  }
  /** Stable, agent-readable form: `CODE: message` */
  toString() {
    return `${this.code}: ${this.message}`;
  }
}

export const notFound = (what: string, key: string, hint?: string) =>
  new AppError("NOT_FOUND", `${what} "${key}" not found${hint ? `. ${hint}` : ""}`);
