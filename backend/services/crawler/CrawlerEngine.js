import { PageParser } from "./PageParser.js";
import { LinkAnalyzer } from "./LinkAnalyzer.js";
import { ContentAnalyzer } from "./ContentAnalyzer.js";
import { ImageAnalyzer } from "./ImageAnalyzer.js";
import { SchemaAnalyzer } from "./SchemaAnalyzer.js";
import { parseRobots } from "./robots.js";
import { safePublicFetch } from "../../security/safe-fetch.js";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function limitedText(response, maxBytes = 2_000_000) { const reader = response.body?.getReader(); if (!reader) return (await response.text()).slice(0, maxBytes); const chunks = []; let size = 0; while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > maxBytes) { await reader.cancel(); throw new Error(`response_too_large:${maxBytes}`); } chunks.push(value); } return new TextDecoder().decode(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)))); }

export class CrawlerEngine {
  constructor({ db, logger }) { this.db = db; this.logger = logger; this.parser = new PageParser(); this.links = new LinkAnalyzer(); this.content = new ContentAnalyzer(); this.images = new ImageAnalyzer(); this.schemas = new SchemaAnalyzer(); }

  async crawl(input, context) {
    const requestedUrl = /^https?:\/\//i.test(String(input.url || "")) ? String(input.url) : `https://${String(input.url || "")}`;
    const root = this.links.normalize(requestedUrl, requestedUrl); if (!root) throw new Error("A valid public website URL is required");
    const maxPages = Math.max(1, Math.min(100, Number(input.maxPages || 25))), delayMs = Math.max(0, Math.min(2000, Number(input.delayMs || 150)));
    const now = new Date(), project = { organizationId: context.organizationId, clientId: context.clientId || null, createdBy: context.userId, rootUrl: root, role: input.crawlRole || "client", status: "running", maxPages, startedAt: now, createdAt: now, updatedAt: now };
    const inserted = await this.db.collection("crawlProjects").insertOne(project); project._id = inserted.insertedId;
    const issues = [], pages = [], allLinks = [], discovered = new Set([root]), queue = [root], crawled = new Set(), sitemapUrls = new Set();
    try {
      const origin = new URL(root).origin;
      let robots = parseRobots("", origin);
      try { const response = await safePublicFetch(`${origin}/robots.txt`, { timeoutMs: 8000 }); if (response.ok) robots = parseRobots(await limitedText(response, 500_000), origin); else issues.push(issue(project, null, "missing_robots", "Medium", `robots.txt returned ${response.status}`)); } catch (error) { issues.push(issue(project, null, "robots_unavailable", "Medium", error.message)); }
      const effectiveDelay = Math.max(delayMs, robots.crawlDelaySeconds * 1000);
      try { const response = await safePublicFetch(`${origin}/sitemap.xml`, { timeoutMs: 8000 }); if (response.ok) for (const match of (await limitedText(response, 1_000_000)).matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)) { const url = this.links.normalize(match[1].trim(), root); if (url && new URL(url).hostname === new URL(root).hostname) sitemapUrls.add(url); } else issues.push(issue(project, null, "missing_sitemap", "Medium", `sitemap.xml returned ${response.status}`)); } catch (error) { issues.push(issue(project, null, "sitemap_unavailable", "Medium", error.message)); }

      while (queue.length && pages.length < maxPages) {
        const url = queue.shift(); if (crawled.has(url)) continue; crawled.add(url);
        if (!robots.allowed(url)) { issues.push(issue(project, url, "robots_blocked", "Low", "URL blocked by robots.txt")); continue; }
        if (pages.length) await wait(effectiveDelay);
        const started = Date.now();
        try {
          const response = await safePublicFetch(url, { timeoutMs: Math.min(30000, Number(input.timeoutMs || 12000)) });
          const contentType = response.headers.get("content-type") || "";
          if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) continue;
          const html = await limitedText(response, Math.min(5_000_000, Number(input.maxResponseBytes || 2_000_000)));
          const page = this.parser.parse({ html, url, finalUrl: response.url || url, status: response.status, durationMs: Date.now() - started, contentType });
          page.content = this.content.analyze(page, input.keywords || []); page.imageAnalysis = this.images.analyze(page.images); page.schemaAnalysis = this.schemas.analyze(page.schemaBlocks); page.projectId = project._id; page.organizationId = context.organizationId; page.clientId = context.clientId || null; page.createdBy = context.userId; page.createdAt = new Date(); page.updatedAt = new Date(); delete page.bodyText; delete page.schemaBlocks;
          const analyzedLinks = this.links.analyze(page.links, page.finalUrl, root); delete page.links;
          page.internalLinkCount = analyzedLinks.filter((link) => link.internal).length;
          page.externalLinkCount = analyzedLinks.filter((link) => !link.internal).length;
          pages.push(page); allLinks.push(...analyzedLinks.map((link) => ({ ...link, projectId: project._id, organizationId: context.organizationId, clientId: context.clientId || null, createdBy: context.userId, createdAt: new Date(), updatedAt: new Date() })));
          if (page.status >= 400) issues.push(issue(project, url, "broken_page", "Critical", `Page returned ${page.status}`));
          if (page.finalUrl !== url) issues.push(issue(project, url, "redirect", "Low", `Redirected to ${page.finalUrl}`));
          if (page.durationMs > 2500) issues.push(issue(project, url, "slow_page", "High", `Response took ${page.durationMs}ms`));
          for (const link of analyzedLinks) if (link.internal && !crawled.has(link.targetUrl) && !discovered.has(link.targetUrl)) { discovered.add(link.targetUrl); queue.push(link.targetUrl); }
        } catch (error) { issues.push(issue(project, url, "crawl_error", "High", error.message)); }
      }

      const pageStatus = new Map(pages.map((page) => [page.url, page.status]));
      for (const link of allLinks) if (link.internal && pageStatus.get(link.targetUrl) >= 400) { link.broken = true; issues.push(issue(project, link.sourceUrl, "broken_link", "High", `Broken internal link to ${link.targetUrl}`)); }
      const linkedTargets = new Set(allLinks.filter((link) => link.internal).map((link) => link.targetUrl));
      for (const url of sitemapUrls) if (url !== root && !linkedTargets.has(url)) issues.push(issue(project, url, "orphan_page", "Medium", "Sitemap URL has no discovered internal link"));
      addDuplicateIssues(project, pages, issues, "title", "duplicate_title"); addDuplicateIssues(project, pages, issues, "description", "duplicate_description");
      if (pages.length) await this.db.collection("crawledPages").insertMany(pages); if (allLinks.length) await this.db.collection("internalLinks").insertMany(allLinks); if (issues.length) await this.db.collection("crawlIssues").insertMany(issues);
      const summary = summarize(pages, allLinks, issues, sitemapUrls);
      await this.db.collection("crawlProjects").updateOne({ _id: project._id, organizationId: context.organizationId }, { $set: { status: "completed", summary, completedAt: new Date(), updatedAt: new Date() } });
      return { projectId: project._id, rootUrl: root, pages, links: allLinks, issues, summary };
    } catch (error) { await this.db.collection("crawlProjects").updateOne({ _id: project._id, organizationId: context.organizationId }, { $set: { status: "failed", error: error.message, failedAt: new Date(), updatedAt: new Date() } }); throw error; }
  }
}

function issue(project, url, type, severity, message) { return { projectId: project._id, organizationId: project.organizationId, clientId: project.clientId, createdBy: project.createdBy, url, type, severity, message, status: "open", createdAt: new Date(), updatedAt: new Date() }; }
function addDuplicateIssues(project, pages, issues, field, type) { const groups = new Map(); for (const page of pages) if (page[field]) { const key = page[field].toLowerCase(); groups.set(key, [...(groups.get(key) || []), page.url]); } for (const urls of groups.values()) if (urls.length > 1) for (const url of urls) issues.push(issue(project, url, type, "High", `${field} is duplicated across ${urls.length} pages`)); }
function summarize(pages, links, issues, sitemapUrls) { const severity = (name) => issues.filter((item) => item.severity === name).length; return { pagesCrawled: pages.length, internalLinks: links.filter((link) => link.internal).length, externalLinks: links.filter((link) => !link.internal).length, sitemapUrls: sitemapUrls.size, issues: issues.length, critical: severity("Critical"), high: severity("High"), medium: severity("Medium"), low: severity("Low") }; }
