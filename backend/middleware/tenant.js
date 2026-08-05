import { ObjectId } from "mongodb";
import { AuthenticationError } from "../lib/errors.js";

export function tenantContext(identity) {
  if (!identity?.authenticated || !ObjectId.isValid(identity.userId) || !ObjectId.isValid(identity.organizationId)) throw new AuthenticationError();
  return { userId: new ObjectId(identity.userId), organizationId: new ObjectId(identity.organizationId), role: identity.role };
}

export function tenantFilter(identity, filter = {}) { return { ...filter, organizationId: tenantContext(identity).organizationId }; }
