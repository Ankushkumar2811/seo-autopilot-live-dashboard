import { BaseAgent } from "../BaseAgent.js";
import { buildNinetyDayStrategy } from "../../services/seo-intelligence/strategy.js";
import { estimateMetrics } from "../agent-utils.js";

export class SeoStrategistAgent extends BaseAgent {
  constructor(deps) { super({ id: "seo-strategist", name: "SEO Strategist Agent", description: "Converts audits, competitors, keywords and business context into a 90-day roadmap", ...deps }); }
  async execute(input, context) { let source = input; if (!input.technical || !input.onPage) source = await context.db.collection("seoStrategies").findOne({ organizationId: context.organizationId, ...(context.clientId ? { clientId: context.clientId } : {}) }, { sort: { createdAt: -1 } }) || input; const strategy = buildNinetyDayStrategy({ technical: source.technical || { score: 0, issues: [] }, onPage: source.onPage || { score: 0 }, opportunities: source.opportunities || [], competitor: source.competitor || {}, keywords: source.keywords || [], business: input.business || input }); const now = new Date(); await context.db.collection("seoStrategies").insertOne({ organizationId: context.organizationId, clientId: context.clientId || null, createdBy: context.userId, type: "90_day_roadmap", strategy, sourceProjectId: source.projectId || null, createdAt: now, updatedAt: now }); return { output: strategy, metrics: estimateMetrics(strategy, "internal") }; }
}
