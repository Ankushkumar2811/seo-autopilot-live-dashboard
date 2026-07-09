import { getDb } from "./_lib/db.js";
import { generateSeoContent } from "./_lib/llm.js";
import { missing, readJson, requireMethod, sendJson } from "./_lib/http.js";
import { prepareBlogContent } from "./_lib/content-format.js";
import { generateImageAsset } from "./_lib/images.js";
import { getKeywordConfig, linkKeywordsInHtml } from "./_lib/seo-links.js";

export default async function handler(req, res) {
  if (!requireMethod(req, res, ["POST"])) return;
  const missingKeys = missing(["WP_SITE_URL", "WP_USERNAME", "WP_APP_PASSWORD"]);
  if (missingKeys.length) {
    return sendJson(res, 428, { ok: false, error: "missing_wordpress_config", missing: missingKeys });
  }

  const body = await readJson(req);
  const items = normalizeItems(body);
  if (!items.length) return sendJson(res, 400, { ok: false, error: "posts_required" });
  if (items.length > 50) return sendJson(res, 400, { ok: false, error: "too_many_posts", message: "Schedule max 50 blogs per request." });

  const results = [];
  for (const item of items) {
    try {
      const result = await scheduleOne(item);
      results.push({ ok: true, title: item.title, ...result });
    } catch (error) {
      results.push({ ok: false, title: item.title, error: error.message });
    }
  }

  const db = await getDb();
  if (db) {
    await db.collection("blogScheduleRuns").insertOne({
      requested: items,
      results,
      createdAt: new Date(),
    });
  }

  sendJson(res, 200, {
    ok: results.every((result) => result.ok),
    results,
  });
}

function normalizeItems(body) {
  if (Array.isArray(body.posts)) return body.posts.map(cleanItem).filter((item) => item.title);
  if (typeof body.text === "string") {
    return body.text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const [date, title, keywords] = line.split("|").map((part) => part?.trim());
        return cleanItem({ title, date, keywords });
      })
      .filter((item) => item.title);
  }
  return [];
}

function cleanItem(item) {
  const keywords = Array.isArray(item.keywords)
    ? item.keywords
    : String(item.keywords || "")
        .split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean);
  if (!keywords.some((keyword) => keyword.toLowerCase() === "unnatix")) keywords.unshift("UnnatiX");
  return {
    title: String(item.title || "").trim(),
    date: String(item.date || item.scheduledDate || "").trim(),
    keywords,
    imageUrl: item.imageUrl || process.env.DEFAULT_FEATURED_IMAGE_URL || "",
    imagePrompt: String(item.imagePrompt || "").trim(),
  };
}

async function scheduleOne(item) {
  const schedule = parseScheduleDate(item.date);
  const keyword = item.keywords?.[0] || item.title;
  const imageAsset = await resolveFeaturedImage(item, defaultImagePrompt(item.title));
  const content = await generateSeoContent({
    businessName: process.env.AUTOPILOT_BUSINESS_NAME || "UnnatiX Technologies",
    city: process.env.AUTOPILOT_CITY || "Indore",
    services: process.env.AUTOPILOT_SERVICES || "SEO, website development, Google Business Profile management",
    keyword,
    title: item.title,
    extraKeywords: item.keywords,
  });

  const blog = content.blog || {};
  const { keywords, linkUrl } = getKeywordConfig(item.keywords);
  const html = linkKeywordsInHtml(prepareBlogContent(ensureBrandMention(blog.content), item.title), keywords, linkUrl);
  const featuredMedia = imageAsset.imageUrl ? await uploadMedia(imageAsset.imageUrl, item.title) : undefined;
  const postBody = {
    title: item.title,
    content: html,
    excerpt: blog.excerpt || "",
    status: schedule.isFuture ? "future" : "draft",
    date: schedule.isFuture ? schedule.wpDate : undefined,
    categories: process.env.WP_DEFAULT_CATEGORY_ID ? [Number(process.env.WP_DEFAULT_CATEGORY_ID)] : undefined,
    featured_media: featuredMedia,
  };

  const post = await wpFetch("/wp-json/wp/v2/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(postBody),
  });

  return {
    postId: post.id,
    link: post.link,
    status: post.status,
    scheduledFor: schedule.wpDate || null,
    provider: content.provider,
    linkedKeywords: keywords,
    featuredMedia: featuredMedia || null,
    imageMode: imageAsset.mode,
    imageUrl: imageAsset.imageUrl || null,
  };
}

function ensureBrandMention(content) {
  const text = String(content || "");
  if (/unnatix/i.test(text)) return text;
  return `${text}\n\n## Work with UnnatiX\nUnnatiX helps businesses plan SEO, website growth, content, and Google visibility with a practical strategy focused on enquiries, calls, and long-term organic growth.`;
}

function defaultImagePrompt(title) {
  return `Realistic high-quality featured image for the blog titled "${title}", UnnatiX digital marketing team working on SEO and website growth, Indian business context, modern office, no text overlay.`;
}

async function resolveFeaturedImage(item, generatedPrompt) {
  const prompt = item.imagePrompt || generatedPrompt;
  if (prompt) {
    try {
      const asset = await generateImageAsset(prompt, item.title);
      if (asset.imageUrl) return asset;
    } catch (error) {
      console.error("featured image generation failed", error.message);
    }
  }
  return {
    mode: item.imageUrl ? "provided_or_default" : "none",
    imageUrl: item.imageUrl || "",
  };
}

function parseScheduleDate(value) {
  if (!value) return { isFuture: false, wpDate: null };
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly ? `${value}T09:30:00+05:30` : value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid schedule date: ${value}`);
  return {
    isFuture: date.getTime() > Date.now() + 5 * 60 * 1000,
    wpDate: toWordPressLocalDate(date),
  };
}

function toWordPressLocalDate(date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
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
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "scheduled-blog";
}
