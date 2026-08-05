import { checkDatabase } from "./_lib/db.js";
import { sendJson } from "./_lib/http.js";
import { getConfig, validateEnvironment } from "../backend/config/env.js";
import { withApiHandler } from "../backend/middleware/api-handler.js";

async function healthHandler(req, res) {
  let database = { status: "not_configured" };
  try {
    database = await checkDatabase();
  } catch (error) {
    database = { status: "error" };
  }

  const config = getConfig();
  const environment = validateEnvironment({ strict: false });

  sendJson(res, 200, {
    ok: true,
    database: database.status,
    databaseDetails: database,
    environment: { valid: environment.valid, warnings: environment.warnings },
    integrations: {
      llm: Boolean(config.ai.openAiKey || config.ai.geminiKey),
      wordpress: config.integrations.wordpressConfigured,
      gmb: config.integrations.gbpConfigured,
      cloudinary: config.integrations.cloudinaryConfigured,
      smtp: config.integrations.smtpConfigured,
    },
  });
}

// Health remains public, but now exercises request IDs, security headers,
// structured completion/error logging, and the shared error boundary.
export default withApiHandler(healthHandler, { authRequired: false });
