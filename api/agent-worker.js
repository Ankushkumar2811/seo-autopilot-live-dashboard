import { sendJson } from "./_lib/http.js";
import { getDb } from "./_lib/db.js";
import { createAgentRuntime } from "../backend/agents/runtime.js";
import { ensureAgentIndexes } from "../backend/agents/indexes.js";

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) return sendJson(res, 405, { ok: false, error: "method_not_allowed" });
  const expected = process.env.CRON_SECRET;
  const supplied = req.headers["x-cron-secret"] || String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!expected) return sendJson(res, 503, { ok: false, error: "cron_not_configured" });
  if (supplied !== expected) return sendJson(res, 401, { ok: false, error: "unauthorized" });
  const db = await getDb();
  if (!db) return sendJson(res, 503, { ok: false, error: "database_not_configured" });
  await ensureAgentIndexes(db);
  const runtime = createAgentRuntime(db);

  const scheduleTenants = await db.collection("agentSchedules").aggregate([{ $match: { status: "active", runAt: { $lte: new Date() } } }, { $group: { _id: "$organizationId", userId: { $first: "$createdBy" } } }]).toArray();
  for (const tenant of scheduleTenants) await runtime.scheduler.tick({ organizationId: tenant._id, userId: tenant.userId });

  const due = await db.collection("agentJobs").find({ status: { $in: ["queued", "retrying"] }, scheduledFor: { $lte: new Date() } }).sort({ scheduledFor: 1 }).limit(Math.min(10, Number(req.query?.limit || 3))).toArray();
  const results = [];
  for (const job of due) {
    try { results.push({ jobId: job._id, ok: true, result: await runtime.manager.runJob(job._id, { organizationId: job.organizationId, userId: job.createdBy, clientId: job.clientId, role: "SYSTEM" }) }); }
    catch (error) { results.push({ jobId: job._id, ok: false, error: error.message }); }
  }
  sendJson(res, 200, { ok: true, schedulesProcessed: scheduleTenants.length, processed: results.length, results });
}
