import { applySecurityHeaders, enforceSameOrigin } from "./security.js";
import { authenticate } from "./authentication.js";
import { handleApiError } from "./error-handler.js";
import { logger } from "../lib/logger.js";
import { AuthorizationError } from "../lib/errors.js";
import { hasPermission } from "../security/permissions.js";
import { getDb } from "../services/database.js";
import { logActivity } from "../services/activity-service.js";
import { safeRequestUrl } from "../security/safe-request-url.js";

export function withApiHandler(handler, options = {}) {
  return async function apiHandler(req, res) {
    const startedAt = Date.now();
    const requestId = applySecurityHeaders(req, res);
    try {
      enforceSameOrigin(req);
      req.context = { requestId, identity: await authenticate(req, { required: options.authRequired }) };
      if (options.permission && !hasPermission(req.context.identity.role, options.permission)) throw new AuthorizationError();
      await handler(req, res);
      if (options.activityAction && req.context.identity?.organizationId && res.statusCode < 400) {
        try { await logActivity(await getDb(), req.context.identity, options.activityAction, { path: req.url }); }
        catch (error) { logger.warn("activity_log_failed", { requestId, action: options.activityAction, error }); }
      }
      logger.info("api_request_completed", { requestId, method: req.method, url: safeRequestUrl(req.url), status: res.statusCode, durationMs: Date.now() - startedAt });
    } catch (error) {
      if (!res.writableEnded) handleApiError(error, req, res, requestId);
      else logger.error("api_post_response_error", { requestId, error });
    }
  };
}
