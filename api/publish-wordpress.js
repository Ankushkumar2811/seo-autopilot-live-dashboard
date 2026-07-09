import { missing, readJson, requireMethod, sendJson } from "./_lib/http.js";

export default async function handler(req, res) {
  if (!requireMethod(req, res, ["POST"])) return;
  const missingKeys = missing(["WP_SITE_URL", "WP_USERNAME", "WP_APP_PASSWORD"]);
  if (missingKeys.length) {
    return sendJson(res, 428, { ok: false, error: "missing_wordpress_config", missing: missingKeys });
  }

  const { title, content, excerpt, status, imageUrl } = await readJson(req);
  if (!title || !content) return sendJson(res, 400, { ok: false, error: "title_and_content_required" });

  try {
    let featuredMedia;
    if (imageUrl) {
      featuredMedia = await uploadMedia(imageUrl, title);
    }

    const post = await wpFetch("/wp-json/wp/v2/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        content,
        excerpt,
        status: status || process.env.WP_PUBLISH_MODE || "draft",
        categories: process.env.WP_DEFAULT_CATEGORY_ID ? [Number(process.env.WP_DEFAULT_CATEGORY_ID)] : undefined,
        featured_media: featuredMedia,
      }),
    });

    sendJson(res, 200, { ok: true, post });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: "wordpress_publish_failed", message: error.message });
  }
}

async function uploadMedia(imageUrl, title) {
  const image = await fetch(imageUrl);
  if (!image.ok) throw new Error(`image_fetch_${image.status}`);
  const bytes = Buffer.from(await image.arrayBuffer());
  const media = await wpFetch("/wp-json/wp/v2/media", {
    method: "POST",
    headers: {
      "Content-Type": image.headers.get("content-type") || "image/jpeg",
      "Content-Disposition": `attachment; filename="${slug(title)}.jpg"`,
    },
    body: bytes,
  });
  return media.id;
}

async function wpFetch(path, options) {
  const base = process.env.WP_SITE_URL.replace(/\/$/, "");
  const auth = Buffer.from(`${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD}`).toString("base64");
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${auth}`,
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `WordPress ${response.status}`);
  return data;
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "seo-image";
}
