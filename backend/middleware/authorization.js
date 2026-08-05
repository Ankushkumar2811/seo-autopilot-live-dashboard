import { AuthorizationError } from "../lib/errors.js";

export function authorize(identity, { roles = [], organizationId } = {}) {
  if (organizationId && identity.organizationId !== organizationId) throw new AuthorizationError("Organization access denied");
  if (roles.length && !roles.some((role) => identity.roles?.includes(role))) throw new AuthorizationError();
  return true;
}
