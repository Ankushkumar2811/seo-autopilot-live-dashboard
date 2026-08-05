import { getConfig } from "../config/env.js";

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const REDACT_KEYS = /password|secret|token|authorization|api[-_]?key|cookie/i;

function sanitize(value, depth = 0) {
  if (depth > 5) return "[MaxDepth]";
  if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack };
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitize(item, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, REDACT_KEYS.test(key) ? "[REDACTED]" : sanitize(item, depth + 1)]));
  }
  return value;
}

function write(level, message, context = {}) {
  const configured = LEVELS[getConfig().app.logLevel] || LEVELS.info;
  if ((LEVELS[level] || LEVELS.info) < configured) return;
  const entry = JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...sanitize(context) });
  const method = level === "error" ? "error" : level === "warn" ? "warn" : "log";
  console[method](entry);
}

export const logger = Object.freeze({
  debug: (message, context) => write("debug", message, context),
  info: (message, context) => write("info", message, context),
  warn: (message, context) => write("warn", message, context),
  error: (message, context) => write("error", message, context),
});
