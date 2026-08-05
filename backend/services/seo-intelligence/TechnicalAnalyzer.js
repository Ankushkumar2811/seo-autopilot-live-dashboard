const weight = { Critical: 20, High: 12, Medium: 6, Low: 2 };
export class TechnicalAnalyzer {
  analyze(crawl) { const issues = [...crawl.issues]; for (const page of crawl.pages) { if (!page.schemaAnalysis?.hasSchema) issues.push(make(page.url, "missing_schema", "Medium", "No valid JSON-LD schema")); if (page.imageAnalysis?.largeImages) issues.push(make(page.url, "large_images", "Medium", `${page.imageAnalysis.largeImages} images have very large declared dimensions`)); const mixed = crawl.links.filter((link) => link.sourceUrl === page.url && page.url.startsWith("https:") && link.targetUrl.startsWith("http:")); if (mixed.length) issues.push(make(page.url, "mixed_content", "High", `${mixed.length} HTTP links on HTTPS page`)); }
    const score = Math.max(0, 100 - issues.reduce((sum, issue) => sum + (weight[issue.severity] || 5), 0) / Math.max(1, Math.sqrt(crawl.pages.length || 1)));
    return { score: Math.round(score), issues: issues.sort((a, b) => (weight[b.severity] || 0) - (weight[a.severity] || 0)), checks: { robots: !issues.some((item) => item.type.includes("robots")), sitemap: !issues.some((item) => item.type.includes("sitemap")), httpHealth: !issues.some((item) => ["broken_page", "crawl_error"].includes(item.type)), redirects: issues.filter((item) => item.type === "redirect").length, duplicateTitles: issues.filter((item) => item.type === "duplicate_title").length, duplicateDescriptions: issues.filter((item) => item.type === "duplicate_description").length } };
  }
}
const make = (url, type, severity, message) => ({ url, type, severity, message, status: "open" });
