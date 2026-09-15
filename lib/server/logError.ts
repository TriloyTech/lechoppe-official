import { appendFileSync } from "node:fs";

type SafeError = {
  name?: string;
  message: string;
  code?: string;
  errno?: string | number;
  syscall?: string;
  address?: string;
  port?: string | number;
  severity?: string;
  hint?: string;
  schema?: string;
  table?: string;
  column?: string;
  constraint?: string;
  routine?: string;
  cause?: SafeError;
  errors?: SafeError[];
};

const SAFE_FIELDS = [
  "code",
  "errno",
  "syscall",
  "address",
  "port",
  "severity",
  "hint",
  "schema",
  "table",
  "column",
  "constraint",
  "routine",
] as const;

function sanitizeText(value: string) {
  return value
    .replace(/([a-z][a-z0-9+.-]*:\/\/)[^@\s/]+@/gi, "$1[redacted]@")
    .replace(/\bBearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/\b(api[-_ ]?key|password|secret|token)(\s*[:=]\s*)[^\s,;]+/gi, "$1$2[redacted]")
    .slice(0, 1_000);
}

function sanitizeError(error: unknown, depth = 0): SafeError {
  if (depth > 3) return { message: "nested_error_depth_exceeded" };

  if (!error || (typeof error !== "object" && typeof error !== "function")) {
    return { message: sanitizeText(String(error)) };
  }

  const source = error as Record<string, unknown>;
  const safe: SafeError = {
    name: typeof source.name === "string" ? source.name : undefined,
    message:
      typeof source.message === "string" && source.message
        ? sanitizeText(source.message)
        : Object.prototype.toString.call(error),
  };

  for (const field of SAFE_FIELDS) {
    const value = source[field];
    if (typeof value === "string" || typeof value === "number") {
      safe[field] = (typeof value === "string" ? sanitizeText(value) : value) as never;
    }
  }

  if (source.cause !== undefined) safe.cause = sanitizeError(source.cause, depth + 1);
  if (Array.isArray(source.errors)) {
    safe.errors = source.errors.slice(0, 5).map((nested) => sanitizeError(nested, depth + 1));
  }

  return safe;
}

export function logServerError(context: string, error: unknown) {
  const entry = JSON.stringify({
    level: "error",
    context,
    error: sanitizeError(error),
  });

  // Next.js can intercept console methods in route runtimes. Writing one bounded,
  // sanitized JSON record directly keeps Docker diagnostics dependable.
  const line = `${entry.slice(0, 8_192)}\n`;
  try {
    appendFileSync("/tmp/lechoppe-server-errors.ndjson", line, {
      encoding: "utf8",
      mode: 0o600,
    });
  } catch {
    // Logging must never replace or mask the original application failure.
  }

  try {
    process.stderr.write(line);
  } catch {
    // The diagnostic fallback above may still be available if stderr is closed.
  }
}
