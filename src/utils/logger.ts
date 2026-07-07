/**
 * Sanitized ring-buffer logger.
 *
 * RULE (privacy invariant): no toast ever contains raw error text, stack traces,
 * or user data - only short fixed i18n strings. This module enforces that rule
 * on the in-memory log side: only the error name is always stored; the message
 * is included only when it belongs to the known-safe allowlist below (i.e. an
 * internal applicative message that cannot contain a habit label or treatment name).
 *
 * console.error receives only the context, error name, and a sanitized stack
 * whose original first line is removed so raw error messages cannot reach logcat.
 */

export type LogEntry = {
  time: string;
  context: string;
  name: string;
  message?: string;
};

const RING_SIZE = 50;
const ring: LogEntry[] = [];

// Messages that are safe to store because they are hard-coded in application code
// and cannot contain user-entered content (habit labels, treatment names, etc.).
const SAFE_MESSAGES = new Set([
  "Failed to insert habit",
  "Failed to insert habit log",
  "Failed to insert treatment",
  "Failed to insert treatment log",
  "Failed to upsert treatment log",
  "Unsupported or invalid export format",
  "Unsupported or invalid CSV format",
  "Empty CSV file",
  "Wrong password",
  "Database not initialized. Call initDatabase() first.",
  "DB not initialized",
  "Database file could not be opened with the current encryption key.",
]);

function sanitizeStack(stack: string | undefined, name: string): string | undefined {
  if (!stack) return undefined;
  const [, ...frames] = stack.split("\n");
  return frames.length > 0 ? [name, ...frames].join("\n") : name;
}

export function logError(context: string, error: unknown): void {
  const e = error as { name?: string; message?: string } | null;
  const name = e?.name && typeof e.name === "string" ? e.name : "Error";
  const rawMsg = e?.message && typeof e.message === "string" ? e.message : "";
  const safeMsg = SAFE_MESSAGES.has(rawMsg) ? rawMsg.slice(0, 200) : undefined;
  const stack = sanitizeStack(error instanceof Error ? error.stack : undefined, name);

  const entry: LogEntry = { time: new Date().toISOString(), context, name };
  if (safeMsg !== undefined) entry.message = safeMsg;

  if (ring.length >= RING_SIZE) ring.shift();
  ring.push(entry);

  // Only sanitized error metadata is visible in logcat.
  // eslint-disable-next-line no-console
  console.error(`[${context}]`, { name, stack });
}

export function getLogEntries(): readonly LogEntry[] {
  return ring;
}

export function safeLocalStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e: unknown) {
    logError("localStorage.setItem", e);
  }
}

export function clearLog(): void {
  ring.length = 0;
}
