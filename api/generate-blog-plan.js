import { getDb } from "./_lib/db.js";
import { readJson, requireMethod, sendJson } from "./_lib/http.js";
import { generateBlogPlan } from "./_lib/llm.js";
import { getKeywordConfig } from "./_lib/seo-links.js";
import { withApiHandler } from "../backend/middleware/api-handler.js";
import { Permissions } from "../backend/security/permissions.js";
import { tenantContext } from "../backend/middleware/tenant.js";

async function handler(req, res) {
  if (!requireMethod(req, res, ["POST"])) return;

  const body = await readJson(req);
  const input = normalizeInput(body);
  if (!input.topic) {
    return sendJson(res, 400, { ok: false, error: "topic_required", message: "Service/topic is required." });
  }

  const result = await generateBlogPlan(input);
  const db = await getDb();
  if (db) {
    const tenant = tenantContext(req.context.identity);
    await db.collection("blogPlanRuns").insertOne({
      organizationId: tenant.organizationId, createdBy: tenant.userId,
      input,
      result,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  sendJson(res, 200, {
    ok: true,
    ...result,
  });
}

export default withApiHandler(handler, { authRequired: true, permission: Permissions.CONTENT_GENERATE, activityAction: "blog_plan_generated" });

function normalizeInput(body) {
  const keywordConfig = getKeywordConfig();
  return {
    businessName: clean(body.businessName || process.env.AUTOPILOT_BUSINESS_NAME || "UnnatiX Technologies"),
    city: clean(body.city || process.env.AUTOPILOT_CITY || "Indore"),
    topic: clean(body.topic || body.service || body.keyword || ""),
    services: clean(body.services || process.env.AUTOPILOT_SERVICES || ""),
    count: Math.min(50, Math.max(1, Number(body.count || 5))),
    startDate: clean(body.startDate || ""),
    cadenceDays: Math.min(30, Math.max(1, Number(body.cadenceDays || 3))),
    linkUrl: keywordConfig.linkUrl,
    excludeTitles: Array.isArray(body.excludeTitles) ? body.excludeTitles.map(clean).filter(Boolean).slice(0, 500) : [],
  };
}

function clean(value) {
  return String(value || "").trim();
}
