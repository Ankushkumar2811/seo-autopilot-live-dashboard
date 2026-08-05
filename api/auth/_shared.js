import { getDb } from "../../backend/services/database.js";
import { AppError } from "../../backend/lib/errors.js";
let indexesPromise;
async function ensureAuthIndexes(db) {
  indexesPromise ||= Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true, name: "users_email_unique" }),
    db.collection("organizations").createIndex({ slug: 1 }, { unique: true, name: "organizations_slug_unique" }),
    db.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "sessions_expiry_ttl" }),
    db.collection("authTokens").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "auth_tokens_expiry_ttl" }),
    db.collection("rateLimits").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "rate_limits_expiry_ttl" }),
    db.collection("clientWorkspaces").createIndex({ organizationId: 1 }, { unique: true, name: "workspace_organization_unique" }),
  ]).catch((error) => { indexesPromise = null; throw error; });
  return indexesPromise;
}
export async function requireDb() { const db = await getDb(); if (!db) throw new AppError("Database is required", { code: "database_not_configured", status: 503 }); await ensureAuthIndexes(db); return db; }
