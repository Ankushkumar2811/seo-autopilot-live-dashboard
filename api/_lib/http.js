import { getConfig } from "../../backend/config/env.js";
import { failure } from "../../backend/api/responses.js";
import { ValidationError } from "../../backend/lib/errors.js";

export function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.end(JSON.stringify(payload));
}

export async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  let totalBytes = 0;
  const maxBytes = getConfig().app.maxBodyBytes;
  for await (const chunk of req) {
    totalBytes += chunk.length;
    if (totalBytes > maxBytes) throw new ValidationError(`Request body exceeds ${maxBytes} bytes`);
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

export function requireMethod(req, res, methods) {
  if (methods.includes(req.method)) return true;
  res.setHeader("Allow", methods.join(", "));
  sendJson(res, 405, failure("method_not_allowed", `Allowed methods: ${methods.join(", ")}`));
  return false;
}

export function missing(keys) {
  return keys.filter((key) => !process.env[key]);
}
