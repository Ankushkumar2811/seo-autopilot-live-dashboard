import { getDb } from "./_lib/db.js";
import { generateSeoContent } from "./_lib/llm.js";
import { readJson, requireMethod, sendJson } from "./_lib/http.js";
import { withApiHandler } from "../backend/middleware/api-handler.js";
import { Permissions } from "../backend/security/permissions.js";
import { tenantContext } from "../backend/middleware/tenant.js";

async function handler(req, res) {
  if (!requireMethod(req, res, ["POST"])) return;
  const input = await readJson(req);
  const content = await generateSeoContent(input);

  const db = await getDb();
  if (db) {
    const tenant = tenantContext(req.context.identity);
    await db.collection("contentDrafts").insertOne({
      organizationId: tenant.organizationId, createdBy: tenant.userId,
      input,
      content,
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  sendJson(res, 200, { ok: true, content });
}

export default withApiHandler(handler, { authRequired: true, permission: Permissions.CONTENT_GENERATE, activityAction: "blog_generated" });
