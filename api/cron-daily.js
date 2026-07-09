import { getDb } from "./_lib/db.js";
import { generateSeoContent } from "./_lib/llm.js";
import { sendJson } from "./_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return sendJson(res, 405, { ok: false, error: "method_not_allowed" });
  }

  const expectedSecret = process.env.CRON_SECRET;
  const suppliedSecret = req.headers["x-cron-secret"] || req.query?.secret;
  if (expectedSecret && suppliedSecret !== expectedSecret) {
    return sendJson(res, 401, { ok: false, error: "unauthorized" });
  }

  const businessName = process.env.AUTOPILOT_BUSINESS_NAME || "UnnatiX Technologies";
  const websiteUrl = process.env.WP_SITE_URL || process.env.AUTOPILOT_WEBSITE_URL;
  const city = process.env.AUTOPILOT_CITY || "Indore";
  const services = process.env.AUTOPILOT_SERVICES || "SEO, website development, Google Business Profile management";
  const keyword = process.env.AUTOPILOT_KEYWORD || "seo company indore";
  const run = {
    businessName,
    websiteUrl,
    city,
    services,
    keyword,
    startedAt: new Date(),
    mode: {
      wpDrafts: process.env.AUTO_CREATE_WP_DRAFTS === "true",
      gmbPublish: false,
    },
  };

  try {
    if (websiteUrl) {
      run.audit = await auditWebsite(websiteUrl);
    }

    run.content = await generateSeoContent({ businessName, city, services, keyword });

    if (process.env.AUTO_CREATE_WP_DRAFTS === "true") {
      run.wordpressDraft = await createWordPressDraft(run.content.blog);
    }

    run.finishedAt = new Date();
    const db = await getDb();
    if (db) {
      await db.collection("autopilotRuns").insertOne(run);
    }

    sendJson(res, 200, {
      ok: true,
      summary: {
        businessName,
        auditScore: run.audit?.score ?? null,
        contentProvider: run.content?.provider || null,
        blogTitle: run.content?.blog?.title || null,
        wordpressDraft: Boolean(run.wordpressDraft),
      },
    });
  } catch (error) {
    run.error = error.message;
    run.finishedAt = new Date();
    const db = await getDb();
    if (db) await db.collection("autopilotRuns").insertOne(run);
    sendJson(res, 500, { ok: false, error: "cron_failed", message: error.message });
  }
}

async function auditWebsite(url) {
  const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  const response = await fetch(normalized, { redirect: "follow" });
  const html = await response.text();
  const title = strip((html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "");
  const description = strip((html.match(/<meta\b(?=[^>]*name=["']description["'])(?=[^>]*content=["']([^"']*)["'])[^>]*>/i) || [])[1] || "");
  const h1Count = [...html.matchAll(/<h1\b[^>]*>/gi)].length;
  const imageCount = [...html.matchAll(/<img\b[^>]*>/gi)].length;
  const missingAlt = [...html.matchAll(/<img\b[^>]*>/gi)].filter((match) => !/\balt=["'][^"']+["']/i.test(match[0])).length;
  const issues = [];
  if (!title) issues.push("Missing page title");
  if (!description) issues.push("Missing meta description");
  if (h1Count !== 1) issues.push(`Expected one H1, found ${h1Count}`);
  if (!/application\/ld\+json/i.test(html)) issues.push("Missing schema");
  if (missingAlt) issues.push(`${missingAlt} images missing alt text`);
  return {
    url: normalized,
    status: response.status,
    title,
    description,
    h1Count,
    imageCount,
    missingAlt,
    score: Math.max(0, 100 - issues.length * 9),
    issues,
  };
}

async function createWordPressDraft(blog) {
  if (!blog?.title || !blog?.content) throw new Error("blog draft missing");
  const missing = ["WP_SITE_URL", "WP_USERNAME", "WP_APP_PASSWORD"].filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`missing ${missing.join(", ")}`);
  const base = process.env.WP_SITE_URL.replace(/\/$/, "");
  const auth = Buffer.from(`${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD}`).toString("base64");
  const response = await fetch(`${base}/wp-json/wp/v2/posts`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: blog.title,
      content: blog.content,
      excerpt: blog.excerpt,
      status: "draft",
      categories: process.env.WP_DEFAULT_CATEGORY_ID ? [Number(process.env.WP_DEFAULT_CATEGORY_ID)] : undefined,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `WordPress ${response.status}`);
  return { id: data.id, link: data.link };
}

function strip(value) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
