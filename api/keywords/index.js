import { ObjectId } from "mongodb";
import { withApiHandler } from "../../backend/middleware/api-handler.js";
import { readJson, requireMethod, sendJson } from "../_lib/http.js";
import { Permissions } from "../../backend/security/permissions.js";
import { tenantContext } from "../../backend/middleware/tenant.js";
import { requireDb } from "../auth/_shared.js";
import { KeywordIntelligence } from "../../backend/services/seo-intelligence/KeywordIntelligence.js";

async function handler(req, res) { const db = await requireDb(), context = tenantContext(req.context.identity), engine = new KeywordIntelligence(); if (req.method === "GET") { const clientId = ObjectId.isValid(req.query?.clientId) ? new ObjectId(req.query.clientId) : null; const keywords = await db.collection("keywords").find({ organizationId: context.organizationId, ...(clientId ? { clientId } : {}) }).sort({ priority: -1 }).limit(500).toArray(); return sendJson(res, 200, { ok: true, keywords }); } if (req.method === "POST") { const body = await readJson(req), clientId = ObjectId.isValid(body.clientId) ? new ObjectId(body.clientId) : null, scoped = { ...context, clientId }, keywords = engine.expand(body); await engine.save(db, scoped, keywords); return sendJson(res, 201, { ok: true, keywords }); } requireMethod(req, res, ["GET", "POST"]); }
export default withApiHandler(handler, { authRequired: true, permission: Permissions.SEO_MANAGE, activityAction: "keyword_added" });
