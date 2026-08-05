import { ValidationError } from "../lib/errors.js";

export function validateObject(input, schema) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new ValidationError("Request body must be an object");
  const output = {};
  const issues = [];
  for (const [field, rules] of Object.entries(schema)) {
    const value = input[field];
    if (rules.required && (value === undefined || value === null || value === "")) issues.push({ field, message: "is required" });
    if (value != null && rules.type && typeof value !== rules.type) issues.push({ field, message: `must be ${rules.type}` });
    if (typeof value === "string" && rules.maxLength && value.length > rules.maxLength) issues.push({ field, message: `must be at most ${rules.maxLength} characters` });
    if (value !== undefined) output[field] = typeof value === "string" && rules.trim !== false ? value.trim() : value;
  }
  if (issues.length) throw new ValidationError("Request validation failed", issues);
  return output;
}

export function requireTenantContext(identity) {
  if (!identity?.organizationId || !identity?.userId) throw new ValidationError("Organization and user context are required");
  return { organizationId: identity.organizationId, createdBy: identity.userId };
}
