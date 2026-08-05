import { ObjectId } from "mongodb";
import { withApiHandler } from "../../backend/middleware/api-handler.js";
import { readJson, requireMethod, sendJson } from "../_lib/http.js";
import { Permissions } from "../../backend/security/permissions.js";
import { tenantContext } from "../../backend/middleware/tenant.js";
import { requireDb } from "../auth/_shared.js";
import { createAgentRuntime } from "../../backend/agents/runtime.js";
import { ensureAgentIndexes } from "../../backend/agents/indexes.js";
import { ensureCrawlerIndexes } from "../../backend/services/crawler/indexes.js";
import { AppError } from "../../backend/lib/errors.js";

async function handler(req, res) {
  const db = await requireDb(); await Promise.all([ensureAgentIndexes(db), ensureCrawlerIndexes(db)]);
  const context = tenantContext(req.context.identity), runtime = createAgentRuntime(db);
  if (req.method === "GET") { const clientId = ObjectId.isValid(req.query?.clientId) ? new ObjectId(req.query.clientId) : null; const filter = { organizationId: context.organizationId, ...(clientId ? { clientId } : {}) }; const [projects, latest] = await Promise.all([db.collection("crawlProjects").find({ ...filter, role: { $ne: "competitor" } }).sort({ createdAt: -1 }).limit(30).toArray(), db.collection("seoStrategies").findOne(filter, { sort: { createdAt: -1 } })]); return sendJson(res, 200, { ok: true, projects, latest }); }
  if (req.method === "POST") { const body = await readJson(req), clientId = ObjectId.isValid(body.clientId) ? new ObjectId(body.clientId) : null; const recent = await db.collection("agentJobs").countDocuments({ organizationId: context.organizationId, agentId: "seo-intelligence", createdAt: { $gte: new Date(Date.now() - 3600000) } }); if (recent >= 5) throw new AppError("Hourly crawl limit reached", { code: "crawl_rate_limited", status: 429 }); const queued = await runtime.manager.enqueue({ agentId: "seo-intelligence", input: { ...body.input, maxPages: Math.min(100, Number(body.input?.maxPages || 25)) }, context: { ...context, clientId }, maxRetries: 2 }); return sendJson(res, 202, { ok: true, job: queued.job, duplicate: queued.duplicate }); }
  requireMethod(req, res, ["GET", "POST"]);
}
export default withApiHandler(handler, { authRequired: true, permission: Permissions.AUDIT_RUN, activityAction: "seo_intelligence_started" });
