import { ObjectId } from "mongodb";
import { withApiHandler } from "../../backend/middleware/api-handler.js";
import { readJson, requireMethod, sendJson } from "../_lib/http.js";
import { Permissions } from "../../backend/security/permissions.js";
import { tenantContext } from "../../backend/middleware/tenant.js";
import { requireDb } from "../auth/_shared.js";
import { createAgentRuntime } from "../../backend/agents/runtime.js";
import { ValidationError } from "../../backend/lib/errors.js";

async function handler(req, res) {
  if (!ObjectId.isValid(req.query?.id)) throw new ValidationError("Invalid crawl project ID"); const db = await requireDb(), context = tenantContext(req.context.identity), projectId = new ObjectId(req.query.id);
  if (req.method === "GET") { const project = await db.collection("crawlProjects").findOne({ _id: projectId, organizationId: context.organizationId }); if (!project) return sendJson(res, 404, { ok: false, error: "crawl_project_not_found" }); const [pages, links, issues, strategy] = await Promise.all([db.collection("crawledPages").find({ projectId, organizationId: context.organizationId }).toArray(), db.collection("internalLinks").find({ projectId, organizationId: context.organizationId }).toArray(), db.collection("crawlIssues").find({ projectId, organizationId: context.organizationId }).sort({ severity: 1 }).toArray(), db.collection("seoStrategies").findOne({ projectId, organizationId: context.organizationId })]); return sendJson(res, 200, { ok: true, project, pages, links, issues, strategy }); }
  if (req.method === "POST") { const project = await db.collection("crawlProjects").findOne({ _id: projectId, organizationId: context.organizationId }); if (!project) return sendJson(res, 404, { ok: false, error: "crawl_project_not_found" }); const body = await readJson(req), runtime = createAgentRuntime(db), intelligenceInput = { ...(project.automationInput || { url: project.rootUrl }), url: project.rootUrl, maxPages: body.maxPages || project.maxPages }; if (body.action === "schedule_weekly") { const schedule = await runtime.manager.schedule({ agentId: "seo-intelligence", input: intelligenceInput, context: { ...context, clientId: project.clientId }, runAt: body.runAt || new Date(Date.now() + 7 * 86400000), recurrence: { intervalMinutes: 10080 } }); return sendJson(res, 202, { ok: true, schedule }); } if (body.action === "rerun") { const queued = await runtime.manager.enqueue({ agentId: "seo-intelligence", input: intelligenceInput, context: { ...context, clientId: project.clientId } }); return sendJson(res, 202, { ok: true, job: queued.job }); } return sendJson(res, 400, { ok: false, error: "unknown_action" }); }
  requireMethod(req, res, ["GET", "POST"]);
}
export default withApiHandler(handler, { authRequired: true, permission: Permissions.AUDIT_RUN });
