import { CrawlerEngine } from "../crawler/CrawlerEngine.js";
import { OnPageAnalyzer } from "./OnPageAnalyzer.js";
import { TechnicalAnalyzer } from "./TechnicalAnalyzer.js";
import { OpportunityEngine } from "./OpportunityEngine.js";
import { CompetitorEngine } from "./CompetitorEngine.js";
import { KeywordIntelligence } from "./KeywordIntelligence.js";
import { buildNinetyDayStrategy } from "./strategy.js";

export class SeoIntelligenceService {
  constructor({ db, logger }) { this.db = db; this.crawler = new CrawlerEngine({ db, logger }); this.onPage = new OnPageAnalyzer(); this.technical = new TechnicalAnalyzer(); this.opportunities = new OpportunityEngine(); this.competitors = new CompetitorEngine(); this.keywords = new KeywordIntelligence(); }
  async analyze(input, context) {
    const previous = await this.db.collection("seoStrategies").findOne({ organizationId: context.organizationId, ...(context.clientId ? { clientId: context.clientId } : {}) }, { sort: { createdAt: -1 } });
    const keywordSet = this.keywords.expand({ keywords: input.keywords, service: input.service || input.services, location: input.location || input.city }); await this.keywords.save(this.db, context, keywordSet);
    const crawl = await this.crawler.crawl({ ...input, keywords: keywordSet.slice(0, 20).map((item) => item.keyword) }, context);
    const onPage = this.onPage.analyze(crawl.pages, keywordSet.map((item) => item.keyword)); const technical = this.technical.analyze(crawl);
    const competitorCrawls = []; for (const url of (input.competitors || []).slice(0, 5)) { try { competitorCrawls.push(await this.crawler.crawl({ url, crawlRole: "competitor", maxPages: Math.min(15, input.competitorMaxPages || 8), delayMs: input.delayMs }, context)); } catch (error) { competitorCrawls.push({ rootUrl: url, pages: [], links: [], issues: [{ type: "competitor_crawl_error", message: error.message }] }); } }
    const competitor = this.competitors.compare(crawl, competitorCrawls); const opportunities = this.opportunities.generate({ pages: crawl.pages, technical, keywords: keywordSet, business: input }); const strategy = buildNinetyDayStrategy({ technical, onPage, opportunities, competitor, keywords: keywordSet, business: input });
    const localScore = calculateLocalScore(crawl.pages, input); const overview = { website: crawl.rootUrl, pages: crawl.summary.pagesCrawled, overallScore: Math.round(technical.score * .4 + onPage.score * .4 + localScore * .2), technicalScore: technical.score, contentScore: onPage.score, localSeoScore: localScore, competitorGap: competitor.missingOpportunities.length, keywordOpportunities: keywordSet.length };
    const previousIssueTypes = new Set(previous?.technical?.issues?.map((item) => item.type) || []), changes = { previousProjectId: previous?.projectId || null, overallScoreDelta: previous?.overview ? overview.overallScore - previous.overview.overallScore : null, technicalScoreDelta: previous?.overview ? overview.technicalScore - previous.overview.technicalScore : null, contentScoreDelta: previous?.overview ? overview.contentScore - previous.overview.contentScore : null, newIssueTypes: technical.issues.map((item) => item.type).filter((type, index, all) => !previousIssueTypes.has(type) && all.indexOf(type) === index) };
    const now = new Date(), analysis = { organizationId: context.organizationId, clientId: context.clientId || null, createdBy: context.userId, projectId: crawl.projectId, overview, changes, technical, onPage, competitor, keywords: keywordSet, opportunities, strategy, createdAt: now, updatedAt: now };
    await this.db.collection("competitorAnalyses").insertOne({ organizationId: context.organizationId, clientId: context.clientId || null, createdBy: context.userId, projectId: crawl.projectId, comparison: competitor, createdAt: now, updatedAt: now });
    if (opportunities.length) await this.db.collection("seoOpportunities").insertMany(opportunities.map((item) => ({ ...item, organizationId: context.organizationId, clientId: context.clientId || null, projectId: crawl.projectId, createdBy: context.userId, status: "open", createdAt: now, updatedAt: now })));
    const automationInput = { url: input.url, businessName: input.businessName, city: input.city, services: input.services, keywords: input.keywords, competitors: (input.competitors || []).slice(0, 5), maxPages: input.maxPages, competitorMaxPages: input.competitorMaxPages };
    await this.db.collection("seoStrategies").insertOne(analysis); await this.db.collection("crawlProjects").updateOne({ _id: crawl.projectId, organizationId: context.organizationId }, { $set: { intelligence: overview, changes, automationInput, updatedAt: new Date() } }); return analysis;
  }
}
function calculateLocalScore(pages, input) { let score = 40; const text = pages.map((page) => `${page.title} ${(page.headings?.h1 || []).join(" ")}`).join(" ").toLowerCase(); if (input.city && text.includes(String(input.city).toLowerCase())) score += 20; if (pages.some((page) => page.schemaAnalysis?.types?.some((type) => String(type).includes("LocalBusiness")))) score += 20; if (pages.some((page) => /contact|location|about/.test(page.url))) score += 10; if (input.phone || input.address) score += 10; return Math.min(100, score); }
