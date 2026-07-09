import { getDb } from "./_lib/db.js";
import { readJson, requireMethod, sendJson } from "./_lib/http.js";

export default async function handler(req, res) {
  if (!requireMethod(req, res, ["POST"])) return;
  const { url, clientId } = await readJson(req);
  if (!url) return sendJson(res, 400, { ok: false, error: "url_required" });

  try {
    const normalized = normalizeUrl(url);
    const response = await fetch(normalized, { redirect: "follow" });
    const html = await response.text();
    const audit = buildAudit(normalized, response, html);

    const db = await getDb();
    if (db) {
      await db.collection("audits").insertOne({
        clientId: clientId || null,
        url: normalized,
        audit,
        createdAt: new Date(),
      });
    }

    sendJson(res, 200, { ok: true, audit });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: "audit_failed", message: error.message });
  }
}

function normalizeUrl(url) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function buildAudit(url, response, html) {
  const title = matchTag(html, "title");
  const description = matchMeta(html, "description");
  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((match) => strip(match[1])).filter(Boolean);
  const links = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)].map((match) => match[1]);
  const images = [...html.matchAll(/<img\b[^>]*>/gi)];
  const missingAlt = images.filter((match) => !/\balt=["'][^"']+["']/i.test(match[0])).length;
  const canonical = /rel=["']canonical["']/i.test(html);
  const schema = /application\/ld\+json/i.test(html);
  const viewport = /name=["']viewport["']/i.test(html);
  const issues = [];

  if (!title) issues.push("Missing page title");
  if (title && title.length > 60) issues.push("Title is longer than 60 characters");
  if (!description) issues.push("Missing meta description");
  if (description && description.length > 160) issues.push("Meta description is longer than 160 characters");
  if (h1s.length !== 1) issues.push(`Expected exactly one H1, found ${h1s.length}`);
  if (!canonical) issues.push("Missing canonical tag");
  if (!schema) issues.push("Missing structured data schema");
  if (!viewport) issues.push("Missing viewport meta tag");
  if (missingAlt) issues.push(`${missingAlt} images missing alt text`);

  const score = Math.max(0, 100 - issues.length * 9);
  return {
    url,
    status: response.status,
    title,
    description,
    h1s,
    linkCount: links.length,
    imageCount: images.length,
    missingAlt,
    canonical,
    schema,
    viewport,
    score,
    issues,
  };
}

function matchTag(html, tag) {
  const match = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? strip(match[1]) : "";
}

function matchMeta(html, name) {
  const re = new RegExp(`<meta\\b(?=[^>]*name=["']${name}["'])(?=[^>]*content=["']([^"']*)["'])[^>]*>`, "i");
  const match = html.match(re);
  return match ? strip(match[1]) : "";
}

function strip(value) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
