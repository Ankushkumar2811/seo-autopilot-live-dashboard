# UnnatiX AI Visibility Engine (GEO)

## Purpose

Phase 5 measures whether configured generative AI providers mention a client brand, where it appears relative to declared competitors, which sources are cited, and which content/entity improvements can increase visibility. Results are observations from sampled model responses, not guaranteed market-wide rankings.

## Architecture

```text
AI Visibility Center -> tenant/RBAC API -> agent queue/scheduler
  -> Query Generator Agent
  -> AI Visibility Monitor Agent -> OpenAI/Gemini adapters -> evidence + usage -> scoring
  -> GEO Optimization Agent -> entity gaps -> recommendations -> client report
```

All records contain `organizationId`; project access always combines the requested identifier with the authenticated tenant. Provider keys remain server environment variables and are never returned to the browser or persisted in response records.

## Collections

- `aiVisibilityProjects`: business, audience, services, locations, competitors and latest baseline.
- `aiQueryTracking`: unique categorized commercial, informational, local and comparison prompts.
- `aiResponseRecords`: provider response, extracted brands, positions, context, sentiment, citations and usage.
- `aiVisibilityScores`: timestamped overall/component scores and comparisons.
- `entityProfiles`: founder, services, locations, socials, reviews, awards, publications and case studies.
- `geoRecommendations`: prioritized entity/content/authority actions.
- `aiVisibilityReports`: immutable snapshots, missed queries, sources and roadmap.
- `aiUsageLogs`: provider, model, tokens, cost estimate, duration and status; one-year TTL.

## Provider integration

`AIVisibilityProvider` exposes `sendQuery`, `captureResponse`, `extractBrands`, `extractSources`, and `calculateScore`. OpenAI and Gemini adapters activate only when their server-side key exists. Unconfigured providers are omitted; results are never fabricated. Perplexity, Claude and Google AI Search can implement the same contract later.

Responses are non-deterministic. Ranking represents observed list/order context for declared brands. Citations are stored as evidence; APIs without grounded source metadata may return none.

## Scoring

Overall score (0–100): brand mention rate 30%, observed position 20%, owned citation rate 15%, query-category coverage 15%, entity authority completeness 10%, and competitor gap 10%. Reviews/schema feed entity and Phase 4 evidence; every component remains separately visible.

## API and automation

- `GET/POST /api/ai-visibility`: list/create projects.
- `GET/POST /api/ai-visibility/:id`: detail, run, query expansion and schedules.
- `GET/POST /api/ai-visibility/entity?clientId=...`: entity profile.

Runs are queued. Default batches are 20 with a server-side `AI_VISIBILITY_DAILY_QUERY_LIMIT` default of 40. Schedule action creates daily sampling (1440 minutes), weekly scoring (10080), and monthly reporting (43200) through the existing Mongo scheduler.

## Security and cost

- HTTP-only authentication, centralized RBAC and tenant filters on every collection.
- Keys only in server configuration.
- Bounded batches/providers and per-tenant daily cap.
- Token, cost estimate, duration and failure logging per attempted call.
- Provider text is untrusted evidence and rendered as text, never injected HTML.

Cost is an estimate and model prices must be maintained. Future work includes official Perplexity/Claude/Google adapters, grounding metadata, repeated statistical sampling, localized prompts, Search Console reconciliation, white-label exports, billing quotas and approval-based content tasks.
