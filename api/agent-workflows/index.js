import { ObjectId } from "mongodb";
import { withApiHandler } from "../../backend/middleware/api-handler.js";
import { readJson, requireMethod, sendJson } from "../_lib/http.js";
import { Permissions } from "../../backend/security/permissions.js";
import { tenantContext } from "../../backend/middleware/tenant.js";
import { requireDb } from "../auth/_shared.js";
import { createAgentRuntime } from "../../backend/agents/runtime.js";
import { ensureAgentIndexes } from "../../backend/agents/indexes.js";

async function handler(req, res) {
  const db = await requireDb(); await ensureAgentIndexes(db);
  const context = tenantContext(req.context.identity), runtime = createAgentRuntime(db);
  if (req.method === "GET") { const runs = await db.collection("workflowRuns").find({ organizationId: context.organizationId }).sort({ createdAt: -1 }).limit(50).toArray(); return sendJson(res, 200, { ok: true, workflows: runtime.workflows.list(), runs }); }
  if (req.method === "POST") { const body = await readJson(req); const result = await runtime.workflows.start(body.workflowId, body.input || {}, { ...context, clientId: ObjectId.isValid(body.clientId) ? new ObjectId(body.clientId) : null }); return sendJson(res, 202, { ok: true, ...result }); }
  requireMethod(req, res, ["GET", "POST"]);
}
export default withApiHandler(handler, { authRequired: true, permission: Permissions.SEO_MANAGE, activityAction: "automation_started" });
