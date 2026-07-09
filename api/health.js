import { getDb } from "./_lib/db.js";
import { sendJson } from "./_lib/http.js";

export default async function handler(req, res) {
  let database = "not_configured";
  try {
    const db = await getDb();
    if (db) {
      await db.command({ ping: 1 });
      database = "connected";
    }
  } catch (error) {
    database = `error:${error.message}`;
  }

  sendJson(res, 200, {
    ok: true,
    database,
    integrations: {
      llm: Boolean(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY),
      wordpress: Boolean(process.env.WP_SITE_URL && process.env.WP_USERNAME && process.env.WP_APP_PASSWORD),
      gmb: Boolean((process.env.GOOGLE_GBP_ACCESS_TOKEN || process.env.GOOGLE_GBP_REFRESH_TOKEN) && process.env.GBP_ACCOUNT_ID && process.env.GBP_LOCATION_ID),
      cloudinary: Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
      smtp: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD),
    },
  });
}
