import { readJson, requireMethod, sendJson } from "./_lib/http.js";
import { generateImageAsset } from "./_lib/images.js";
import { withApiHandler } from "../backend/middleware/api-handler.js";
import { Permissions } from "../backend/security/permissions.js";

async function handler(req, res) {
  if (!requireMethod(req, res, ["POST"])) return;
  const { prompt, title } = await readJson(req);
  if (!prompt) return sendJson(res, 400, { ok: false, error: "prompt_required" });

  try {
    const result = await generateImageAsset(prompt, title);
    sendJson(res, 200, { ok: true, ...result });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: "image_generation_failed", message: error.message, prompt });
  }
}

export default withApiHandler(handler, { authRequired: true, permission: Permissions.CONTENT_GENERATE, activityAction: "image_generated" });
