# UnnatiX Advanced SEO Intelligence Engine

## Architecture

Phase 4 runs website intelligence as Phase 3 agent jobs rather than long synchronous requests.

```text
SEO Intelligence Center
  -> POST /api/seo-intelligence
  -> AgentManager queues seo-intelligence
  -> cron/manual worker leases the job
  -> CrawlerEngine
       -> robots.txt + sitemap
       -> PageParser / LinkAnalyzer
       -> ContentAnalyzer / ImageAnalyzer / SchemaAnalyzer
  -> OnPageAnalyzer + TechnicalAnalyzer
  -> KeywordIntelligence + CompetitorEngine
  -> OpportunityEngine
  -> 90-day SEO strategy
  -> tenant-scoped MongoDB records
  -> dashboard baseline/change comparison
```

The original `/api/audit` remains available for fast single-page checks. The intelligence engine is the multi-page, persistent analysis path.

## Crawler flow

1. Validate and normalize the public HTTP(S) root URL.
2. Reuse the SSRF-safe fetcher, including DNS/private-network checks, safe redirects and timeouts.
3. Fetch and parse `robots.txt`; apply `User-agent: *` allow/disallow prefix rules and crawl delay.
4. Fetch `/sitemap.xml` for discovery and orphan-page comparison.
5. Crawl breadth-first, same-host only, without fragments or binary/static asset URLs.
6. Enforce maximum pages (default 25, hard maximum 100), per-page delay, timeout and response-size limit.
7. Normalize URLs and prevent duplicate requests.
8. Parse metadata, headings, body word count, links, images, canonical, robots directives and JSON-LD.
9. Persist page and link records, then detect broken links, slow pages, redirects, sitemap orphans and duplicate metadata.
10. Complete or fail the crawl project with a durable summary/error.

The robots parser intentionally implements conservative prefix matching. Wildcard/end-anchor semantics and sitemap index recursion are future extensions.

## Modules

`backend/services/crawler`:

- `CrawlerEngine`: bounded orchestration and persistence.
- `PageParser`: HTML metadata, headings, links, images and schema extraction.
- `LinkAnalyzer`: normalization and internal/external graph classification.
- `ContentAnalyzer`: word count, depth, keyword coverage and CTR heuristic.
- `ImageAnalyzer`: missing alt, filename quality and declared large dimensions.
- `SchemaAnalyzer`: JSON-LD parsing, types and errors.
- `robots`: robots rules, crawl delay and sitemap declarations.

`backend/services/seo-intelligence`:

- `OnPageAnalyzer`: page-level 0–100 scoring.
- `TechnicalAnalyzer`: crawl-wide technical severity and score.
- `OpportunityEngine`: action-oriented growth recommendations.
- `CompetitorEngine`: client/competitor page, content, topic, schema, location and internal-link comparison.
- `KeywordIntelligence`: intent, heuristic difficulty, priority, location and service classification.
- `SeoIntelligenceService`: orchestration and persistence.
- `strategy`: deterministic, auditable 90-day roadmap.

## Database collections

### `crawlProjects`

One crawl run with organization/client ownership, root URL, limits, status, timestamps, crawl summary, intelligence scores and comparison delta.

### `crawledPages`

One record per normalized project URL containing response status/timing, final URL, metadata, canonical, indexability, headings, word count, link counts, images and schema analysis.

### `internalLinks`

The page graph: source, target, anchor, internal/external classification and broken status.

### `crawlIssues`

Normalized issues with URL, type, `Critical|High|Medium|Low` severity, message and workflow status.

### Related intelligence collections

- `seoOpportunities`: issue, reason, impact, priority and suggested action.
- `competitorAnalyses`: client-versus-competitor profile and gaps.
- `seoStrategies`: scores, changes, keywords, opportunities and 90-day roadmap.
- `keywords`: keyword, search intent, difficulty, priority, location, service and status.

Every record includes `organizationId`, `createdBy`, `createdAt` and `updatedAt`; client records also carry `clientId`.

## Analyzer logic

### On-page score

Starts at 100 per page and applies weighted deductions for missing/out-of-range titles and descriptions, H1/H2 structure, thin content, keyword coverage, image alt text, canonical and indexability. The project content score is the page average.

CTR score is a transparent length/coverage heuristic, not Search Console click-through data.

### Technical score

Uses crawl issues plus schema, mixed-content and image findings. Critical, High, Medium and Low issues have decreasing weights normalized by crawl size.

### Local score

Uses city coverage in titles/headings, LocalBusiness schema, contact/location pages and supplied phone/address context. Future versions should add GBP and citation evidence.

### Opportunities

The engine creates recommendations, not only errors. Each output includes:

- Issue
- Reason
- Impact
- Priority
- Suggested action
- Related URL where applicable

It detects thin-page expansion, FAQ schema, internal links, CTR improvements, missing keyword landing pages, location pages and critical technical fixes.

### Competitors

Up to five public competitors are crawled with a lower page limit. Comparison covers top pages, average/content depth, heading-derived topics, services, location pages, schema types and internal-link density. Failed competitor crawls are isolated and do not fail the client crawl.

### Keywords

Intent categories are informational, commercial, local and transactional. Difficulty and priority are explainable heuristics until a search-volume/ranking provider is integrated.

## Agents

- `seo-intelligence`: runs the full crawler and intelligence pipeline, persists results and emits `audit_completed`.
- `seo-strategist`: accepts audit/competitor/keyword/business data or loads the latest tenant analysis and creates a 90-day roadmap.

These extend the existing BaseAgent contract and inherit queue isolation, retries, history, cancellation, memory, scheduling and monitoring.

## APIs

- `GET /api/seo-intelligence?clientId=...`: crawl history and latest strategy.
- `POST /api/seo-intelligence`: enqueue a bounded crawl.
- `GET /api/seo-intelligence/:id`: project pages, links, issues and strategy.
- `POST /api/seo-intelligence/:id`: `rerun` or `schedule_weekly`.
- `GET /api/keywords?clientId=...`: prioritized keyword inventory.
- `POST /api/keywords`: classify/expand and save keywords.

All endpoints use Phase 2 authentication, RBAC and tenant filters. Crawl creation has an organization-level hourly limit.

## Weekly automation

Weekly scheduling creates a recurring `seo-intelligence` AgentSchedule. The secret-protected worker expands due schedules and processes bounded job batches. Each completed analysis compares the previous overall, technical and content scores and identifies new issue types.

## Security and performance

- Public URL and every redirect are SSRF checked.
- Private, loopback, metadata and non-HTTP targets are rejected.
- Same-host crawl boundary.
- Robots and crawl delay respected.
- Maximum pages, response bytes, redirects and timeouts.
- Sequential crawl requests avoid aggressive concurrency.
- Queue leasing, retry/backoff, cancellation and execution history.
- Mongo indexes for project history, normalized page uniqueness, link graph and issue priority.
- Competitor count capped at five.

## Future extensions

- Full RFC robots wildcard matching and multiple sitemap/sitemap-index traversal.
- Headless rendering for JavaScript-heavy sites.
- Core Web Vitals/CrUX and Lighthouse integration.
- Search Console, GBP, rank tracking and backlink provider data.
- Search-volume/CPC/SERP keyword data.
- Distributed crawler workers with host-level concurrency budgets.
- Content similarity/near-duplicate detection using embeddings.
- Historical charts and issue-resolution workflow.
- Named workflow artifacts and managed durable queue infrastructure.
