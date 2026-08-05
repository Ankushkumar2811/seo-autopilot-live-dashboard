import { BaseAgent } from "../BaseAgent.js";
import { SeoIntelligenceService } from "../../services/seo-intelligence/SeoIntelligenceService.js";
import { estimateMetrics } from "../agent-utils.js";

export class SeoIntelligenceAgent extends BaseAgent {
  constructor(deps) { super({ id: "seo-intelligence", name: "SEO Intelligence Agent", description: "Crawls websites and produces technical, content, local, competitor and opportunity intelligence", ...deps }); }
  async validate(input, context) { await super.validate(input, context); if (!input.url) throw new Error("url is required"); }
  async execute(input, context) { const analysis = await new SeoIntelligenceService({ db: context.db }).analyze(input, context); await this.memory.merge(context, this.id, { lastProjectId: analysis.projectId, lastScore: analysis.overview.overallScore, lastRunAt: new Date() }); await this.events.emit("audit_completed", { projectId: analysis.projectId, score: analysis.overview.overallScore, intelligence: true }, context); return { output: analysis, metrics: estimateMetrics({ overview: analysis.overview, opportunityCount: analysis.opportunities.length }, "internal") }; }
}
