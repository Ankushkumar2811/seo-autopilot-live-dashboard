import { failure } from "../api/responses.js";
import { logger } from "../lib/logger.js";
import { normalizeError } from "../lib/errors.js";
import { safeRequestUrl } from "../security/safe-request-url.js";

export function handleApiError(error, req, res, requestId) {
  const normalized = normalizeError(error);
  logger.error("api_request_failed", { requestId, method: req.method, url: safeRequestUrl(req.url), error, code: normalized.code });
  const message = normalized.expose ? normalized.message : "Internal server error";
  res.statusCode = normalized.status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(failure(normalized.code, message, normalized.details)));
}
