import { missing, requireMethod, sendJson } from "./_lib/http.js";

export default async function handler(req, res) {
  if (!requireMethod(req, res, ["GET"])) return;
  const missingKeys = missing(["WP_SITE_URL", "WP_USERNAME", "WP_APP_PASSWORD"]);
  if (missingKeys.length) {
    return sendJson(res, 428, { ok: false, error: "missing_wordpress_config", missing: missingKeys });
  }

  try {
    const user = await wpFetch("/wp-json/wp/v2/users/me?context=edit");
    const categories = await wpFetch("/wp-json/wp/v2/categories?per_page=10");
    sendJson(res, 200, {
      ok: true,
      wordpress: {
        site: process.env.WP_SITE_URL,
        user: user?.name || user?.slug || "connected",
        canPublishDrafts: true,
        defaultCategoryId: process.env.WP_DEFAULT_CATEGORY_ID || null,
        categories: categories.map((category) => ({ id: category.id, name: category.name })),
      },
    });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: "wordpress_check_failed", message: error.message });
  }
}

async function wpFetch(path) {
  const base = process.env.WP_SITE_URL.replace(/\/$/, "");
  const auth = Buffer.from(`${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD}`).toString("base64");
  const response = await fetch(`${base}${path}`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `WordPress ${response.status}`);
  return data;
}
