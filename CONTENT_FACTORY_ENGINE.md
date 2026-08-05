# Autonomous Content Factory and Topical Authority Engine

## Architecture

```text
Content Intelligence Center
 -> tenant/RBAC API -> agent queue
 -> Topical Authority + Keyword Research
 -> SEO Briefs -> Content Writer -> Optimizer -> Human review/approval
 -> Image + Internal Links -> WordPress Agent -> published document
 -> imported performance -> Learning + Refresh -> next calendar
```

The factory extends the existing React/Vite dashboard, Mongo-backed agent system, OpenAI/Gemini generation fallback, Cloudinary image path and WordPress REST integration. Existing blog schedules and `contentDrafts` are preserved; new projects run in parallel.

## Agents

- Topical Authority Agent: service/location/audience-derived pillar and supporting clusters.
- Keyword Research Agent: informational, commercial, transactional/local mapping with priority and business value.
- Content Brief Agent: title, metadata, slug, intent, outline, FAQs, schema, links and CTAs.
- Content Writer Agent: persistent long-form document from a stored brief.
- Content Optimization Agent: depth, keyword coverage, entities, missing sections and readability.
- Content Internal Link Agent: source/target/anchor/reason recommendations.
- Content Refresh Agent: age, rank decline and traffic decline rules.
- Content Image Agent: featured/social/infographic generation, alt text, prompt and Cloudinary metadata.
- Content Calendar Agent: bounded priority/cadence/seasonality plan.
- Content Learning Agent: strategies from imported Search Console, analytics and ranking evidence only.

## Database

Collections are `contentProjects`, `keywordClusters`, `contentBriefs`, `contentDocuments`, `contentPerformances`, `contentCalendars`, `contentImages`, `internalLinkSuggestions`, and `contentRecommendations`. Every record is tenant-scoped. Compound indexes protect cluster/slug uniqueness and support project/status/date access.

Documents use `draft -> review -> approved -> published`. Workflow timestamps and document version are stored. AI creation never implicitly grants approval. WordPress publishing rechecks the persisted approved document, supports draft/future/publish states, categories, tags, featured media, schema markup, internal links and optional Yoast meta fields. WordPress may require registering meta fields depending on installed SEO plugins.

## Automation

- Daily: rebuild/check topical opportunities.
- Weekly: regenerate prioritized content calendar.
- Monthly: evaluate stale and declining content.

Schedules reuse the durable Mongo agent scheduler and must be ticked/executed by the configured Vercel worker cron.

## Cost and performance feedback

Agent jobs retain provider, token and estimated cost metrics; the project API aggregates cost per client/project. Performance import accepts real traffic, ranking, clicks, impressions and conversions. Until Google Search Console/Analytics integrations are configured, Learning Agent returns `awaiting_performance_data` instead of invented recommendations.

## Future improvements

Add OAuth-based Search Console/GA4 ingestion, rank tracker adapters, editorial diff/version UI, plagiarism/factuality services, WordPress taxonomy resolution, per-tenant encrypted WordPress credentials, webhook reconciliation, content decay forecasts, quota billing, distributed long-running workers and approval notifications.
