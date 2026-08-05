import { getConfig } from "../config/env.js";
import { AuthenticationError } from "../lib/errors.js";
import { getAccessToken } from "../security/cookies.js";
import { verifyAccessToken } from "../security/tokens.js";

// Compatibility placeholder: replace token parsing with a verified identity provider.
export async function authenticate(req, { required = getConfig().app.authRequired } = {}) {
  const token = getAccessToken(req);
  if (!token) {
    if (required) throw new AuthenticationError();
    return { authenticated: false, userId: null, organizationId: null, roles: [] };
  }
  const claims = verifyAccessToken(token);
  return { authenticated: true, userId: claims.sub, organizationId: claims.org, role: claims.role, roles: [claims.role], sessionId: claims.sid };
}
