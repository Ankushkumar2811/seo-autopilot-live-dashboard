import crypto from "node:crypto";
import { getConfig } from "../config/env.js";
import { AuthorizationError } from "../lib/errors.js";

export function applySecurityHeaders(req, res) {
  const requestId = String(req?.headers?.["x-request-id"] || crypto.randomUUID());
  res.setHeader("X-Request-Id", requestId);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cache-Control", "no-store");

  const origin = req?.headers?.origin;
  const allowed = getConfig().app.allowedOrigins;
  if (origin && allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  return requestId;
}

export function enforceSameOrigin(req) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return;
  const origin = req.headers?.origin;
  if (!origin) return;
  const config = getConfig();
  const allowed = new Set([config.app.url, ...config.app.allowedOrigins].map((value) => value.replace(/\/$/, "")));
  if (!allowed.has(String(origin).replace(/\/$/, ""))) throw new AuthorizationError("Cross-origin request denied");
}
