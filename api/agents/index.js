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
  const runtime = createAgentRuntime(db), context = tenantContext(req.context.identity);
  if (req.method === "GET") return sendJson(res, 200, { ok: true, agents: runtime.registry.list() });
  if (req.method === "POST") {
    const body = await readJson(req);
    const scopedContext = { ...context, clientId: ObjectId.isValid(body.clientId) ? new ObjectId(body.clientId) : null };
    if (body.runAt) { const schedule = await runtime.manager.schedule({ agentId: body.agentId, input: body.input || {}, context: scopedContext, runAt: body.runAt, recurrence: body.recurrence, idempotencyKey: body.idempotencyKey }); return sendJson(res, 202, { ok: true, schedule }); }
    const queued = await runtime.manager.enqueue({ agentId: body.agentId, input: body.input || {}, context: scopedContext, idempotencyKey: body.idempotencyKey, maxRetries: body.maxRetries });
    return sendJson(res, 202, { ok: true, job: queued.job, duplicate: queued.duplicate });
  }
  requireMethod(req, res, ["GET", "POST"]);
}
export default withApiHandler(handler, { authRequired: true, permission: Permissions.SEO_MANAGE, activityAction: "agent_job_queued" });
