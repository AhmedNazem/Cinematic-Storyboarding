import { randomUUID } from "crypto";

/** Log levels ordered by severity */
const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
type LogLevel = (typeof LOG_LEVELS)[number];

/** Fields that must never appear in logs */
const REDACTED_KEYS = new Set([
  "authorization",
  "password",
  "token",
  "secret",
  "cookie",
  "creditcard",
]);

const REDACTED_VALUE = "[REDACTED]";

/** Recursively redact sensitive fields from an object */
function redact(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) return obj.map(redact);

  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    cleaned[key] = REDACTED_KEYS.has(key.toLowerCase())
      ? REDACTED_VALUE
      : redact(value);
  }
  return cleaned;
}

/** Structured log entry shape */
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  correlationId?: string;
  [key: string]: unknown;
}

/** Create a structured JSON log line */
function createEntry(
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>,
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...redact(meta) as Record<string, unknown>,
  };
}

/**
 * Structured JSON logger — AXIOM standard.
 * Outputs JSON lines with timestamp, level, message, correlationId.
 * Automatically redacts sensitive fields (password, token, secret, etc.).
 */
export const logger = {
  debug(message: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === "production") return;
    console.debug(JSON.stringify(createEntry("debug", message, meta)));
  },

  info(message: string, meta?: Record<string, unknown>): void {
    console.info(JSON.stringify(createEntry("info", message, meta)));
  },

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(JSON.stringify(createEntry("warn", message, meta)));
  },

  error(message: string, meta?: Record<string, unknown>): void {
    console.error(JSON.stringify(createEntry("error", message, meta)));
  },

  /** Create a child logger with a bound correlationId */
  child(correlationId: string) {
    return {
      debug: (msg: string, meta?: Record<string, unknown>) =>
        logger.debug(msg, { correlationId, ...meta }),
      info: (msg: string, meta?: Record<string, unknown>) =>
        logger.info(msg, { correlationId, ...meta }),
      warn: (msg: string, meta?: Record<string, unknown>) =>
        logger.warn(msg, { correlationId, ...meta }),
      error: (msg: string, meta?: Record<string, unknown>) =>
        logger.error(msg, { correlationId, ...meta }),
    };
  },

  /** Generate a new correlation ID */
  generateId: (): string => randomUUID(),
};
