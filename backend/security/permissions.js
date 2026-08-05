export const Roles = Object.freeze({ SUPER_ADMIN: "SUPER_ADMIN", AGENCY_OWNER: "AGENCY_OWNER", AGENCY_ADMIN: "AGENCY_ADMIN", SEO_MANAGER: "SEO_MANAGER", SEO_EXECUTIVE: "SEO_EXECUTIVE", CONTENT_WRITER: "CONTENT_WRITER", CLIENT: "CLIENT" });
export const Permissions = Object.freeze({
  BILLING_MANAGE: "billing:manage", TEAM_MANAGE: "team:manage", CLIENT_READ: "client:read", CLIENT_WRITE: "client:write",
  SEO_MANAGE: "seo:manage", AUDIT_RUN: "audit:run", CONTENT_GENERATE: "content:generate", BLOG_WRITE: "blog:write", PUBLISH: "publish", REPORT_READ: "report:read",
});
const all = Object.values(Permissions);
export const ROLE_PERMISSIONS = Object.freeze({
  SUPER_ADMIN: all, AGENCY_OWNER: all,
  AGENCY_ADMIN: all.filter((p) => p !== Permissions.BILLING_MANAGE),
  SEO_MANAGER: [Permissions.CLIENT_READ, Permissions.CLIENT_WRITE, Permissions.SEO_MANAGE, Permissions.AUDIT_RUN, Permissions.CONTENT_GENERATE, Permissions.BLOG_WRITE, Permissions.PUBLISH, Permissions.REPORT_READ],
  SEO_EXECUTIVE: [Permissions.CLIENT_READ, Permissions.SEO_MANAGE, Permissions.AUDIT_RUN, Permissions.CONTENT_GENERATE, Permissions.BLOG_WRITE, Permissions.REPORT_READ],
  CONTENT_WRITER: [Permissions.CLIENT_READ, Permissions.CONTENT_GENERATE, Permissions.BLOG_WRITE, Permissions.REPORT_READ],
  CLIENT: [Permissions.CLIENT_READ, Permissions.REPORT_READ],
});
export function hasPermission(role, permission) { return Boolean(ROLE_PERMISSIONS[role]?.includes(permission)); }
