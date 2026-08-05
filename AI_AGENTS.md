# UnnatiX AI Agent Framework

## Overview

The Phase 3 framework turns direct SEO actions into tenant-scoped, observable jobs. It is implemented as native ESM JavaScript because the existing Vercel backend runs JavaScript and has no TypeScript compiler. The requested `BaseAgent.ts`-style architecture maps directly to executable `.js` modules without introducing a second build pipeline.

Core modules:

- `BaseAgent.js`: validation, execution, rollback, structured output and logging lifecycle.
- `AgentManager.js`: enqueue, deduplication, leasing, execution, retries, history, cancellation and workflow advancement.
- `AgentMemory.js`: client/agent preferences, previous outcomes, writing style, keywords and publishing-time memory.
- `AgentEvents.js`: persistent event bus for supported SEO lifecycle events.
- `AgentRegistry.js`: explicit agent registration and discovery.
- `AgentScheduler.js`: one-time and recurring Mongo-backed schedules.
- `WorkflowEngine.js`: sequential collaborative agent workflows.
- `runtime.js`: creates one coherent runtime per Vercel invocation.

## Lifecycle

```text
API / event / schedule
  -> enqueue tenant-scoped job
  -> deduplicate active idempotency key
  -> queued
  -> worker obtains atomic running lease
  -> agent.validate()
  -> agent.execute()
  -> completed + metrics + workflow continuation
       or retrying with exponential backoff
       or failed after max retries
       or cancelled by an authorized user
```

Statuses are `queued`, `running`, `completed`, `failed`, `retrying`, and `cancelled`. Every transition is appended to `history`. A job records organization, client, creator, agent, input, sanitized error, attempts, schedule time, output, workflow metadata and metrics.

## Base agent contract

Every agent has `id`, `name`, `description`, `run()`, `validate()`, `execute()`, `rollback()`, and `log()`. Successful runs return:

```json
{
  "ok": true,
  "agentId": "blog-writer",
  "output": {},
  "metrics": {
    "provider": "openai",
    "tokens": 1200,
    "costEstimate": 0.0024,
    "costEstimated": true
  },
  "startedAt": "...",
  "finishedAt": "..."
}
```

## Registered agents

1. SEO Audit: SSRF-safe public website inspection, severity and persisted audit results.
2. Technical SEO: title, meta, H1, canonical, schema, images, robots, sitemap, links and redirects recommendations.
3. Content Strategy: blog roadmap, topic/keyword clusters, internal links and cadence using the existing provider fallback.
4. Blog Writer: article, outline, metadata, slug, FAQ, Article schema and image prompt.
5. WordPress: approved draft/schedule/update/media/category/tag publishing. Without approval it returns an approval package.
6. GBP: post/offer/event-ready generation and approved publishing.
7. Review: requests, reminders, response tracking and owner replies.
8. Backlink: citations, directories, guest posts, outreach, anchors and workflow tracking.
9. Internal Linking: page discovery, contextual anchors and optional draft update.
10. Schema: Organization, LocalBusiness, FAQ, Article, Review, Breadcrumb, Service and Person JSON-LD.
11. Report: weekly/monthly score trends, automation success, cost and client summary.
12. Notification: dashboard and email delivery; Slack/webhook adapter slots are future-ready.
13. SEO Intelligence: robots-aware multi-page crawling, scoring, competitor gaps, keywords and opportunities.
14. SEO Strategist: converts intelligence data into a prioritized 90-day roadmap.
15. AI Query Generator: creates and classifies commercial, informational, local and comparison queries.
16. AI Visibility Monitor: stores brand, position, citation and usage evidence from configured AI providers.
17. GEO Optimization: turns visibility, entity and competitor gaps into recommendations and reports.
18. Topical Authority: creates pillar/supporting clusters and measures coverage.
19. Keyword Research: maps intent, business value, target page and priority.
20. Content Brief: produces titles, metadata, structure, FAQs, schema, links and CTAs.
21. Content Writer: creates durable long-form drafts from briefs.
22. Content Optimization: scores depth, keyword use, entities, sections and readability.
23. Content Internal Link: suggests source, target, anchor and reason.
24. Content Refresh: finds stale or declining published documents.
25. Content Image: creates featured, social and infographic assets with metadata.
26. Content Calendar: plans priority/seasonality-aware publishing.
27. Content Learning: learns only from imported real performance signals.
28. GBP Optimization: syncs tenant GBP evidence and recommends completeness/activity improvements.
29. Local Rank: stores supplied local-pack/organic observations and movement history.
30. Citation Management: discovers and tracks local/industry/chamber/association opportunities.
31. NAP Checker: safely scans supplied public listing URLs for canonical-data mismatches.
32. Local Competitor: compares reviews, ratings, categories, photos, posts and services.
33. Location Page: creates unique service-location drafts with FAQs, schema and links.
34. Local SEO Report: produces score, ranking, review, GBP, citation and action summaries.
35. Backlink Discovery: creates scored directory, partner, editorial, association, resource and media opportunities.
36. Competitor Backlink: converts provider observations into common-domain and authority-gap reports.
37. Digital PR: develops research, commentary, interview, podcast and webinar opportunities.
38. Authority Outreach: generates personalized email/LinkedIn/follow-ups and uses one-time approval for delivery.
39. Backlink Monitor: verifies explicit source URLs and detects lost, broken, anchor and nofollow changes.
40. Brand Mention: safely scans supplied public URLs for unlinked company/founder/product mentions.
41. Authority Report: joins backlink, PR, Content Factory and GEO signals into growth recommendations.

## Events

Supported persistent events:

- `website_added`
- `audit_completed`
- `blog_generated`
- `wordpress_published`
- `review_received`
- `gbp_posted`
- `keyword_added`
- `backlink_found`
- `automation_started`
- `automation_completed`

In-process subscribers are useful within one invocation. Cross-invocation reactions must read persistent `agentEvents` or be expressed as workflows/jobs because Vercel instances do not share memory.

## Memory

`agentMemory` has a unique `(organizationId, clientId, agentId)` boundary. Agents can store client preferences, writing style, preferred keywords/times and historical summaries. Raw credentials must never be stored in memory. Full execution history remains in `agentJobs`.

## Workflows

`website-onboarding` queues:

```text
SEO Audit -> Technical SEO -> Content Strategy -> Blog Writer
-> Internal Linking -> Schema -> WordPress approval package
-> GBP draft -> Backlink Plan -> Notification
```

`review-received` queues:

```text
Review response -> GBP draft -> Client notification
```

The WordPress and GBP workflow steps do not publish unless their explicit input has `approved: true`.

## Scheduling and workers

`/api/agent-worker` is protected by `CRON_SECRET` and processes a small bounded batch. Vercel cron calls it every ten minutes. Mongo leases and status filters prevent two workers from successfully claiming the same job. Retries use exponential backoff.

The legacy `/api/cron-daily` remains operational. When `AUTOPILOT_ORGANIZATION_ID`, `AUTOPILOT_USER_ID`, and optional `AUTOPILOT_CLIENT_ID` are configured, it also starts the new tenant-scoped website workflow in approval-safe mode.

## Cost and monitoring

Jobs record execution time, provider, estimated tokens, estimated cost, error, retry count and outcome. Existing LLM adapters do not yet return provider billing usage, so token/cost values are explicitly marked estimates. The Automation Center aggregates per-organization jobs and costs; client scoping is stored on each job.

## Adding an agent

1. Extend `BaseAgent` in `backend/agents/specialized`.
2. Give it a stable lowercase ID and clear description.
3. Validate all required input and tenant context.
4. Keep data access filtered by `organizationId` and `clientId`.
5. Return `{ output, metrics }` from `execute()`.
6. Implement rollback semantics for external side effects.
7. Emit a supported event when useful.
8. Register the class in `AgentRegistryFactory.js`.
9. Add unit tests for validation, isolation, idempotency, retry and cancellation.
10. Add it to workflows only when outputs/inputs have a stable contract.

## API surface

- `GET/POST /api/agents`: registry and enqueue.
- `GET /api/agent-jobs`: queue, history, status metrics and cost.
- `POST /api/agent-jobs/:id`: `run`, `retry`, or `cancel`.
- `GET/POST /api/agent-workflows`: definitions/history and workflow start.
- `GET/POST /api/agent-worker`: secret-protected bounded worker.

All user-facing endpoints require Phase 2 authentication and RBAC. The worker derives tenant/user context from each persisted job.

## Production limitations and next hardening

- Vercel cron is queue-ready orchestration, not a fully durable managed queue.
- Running cancellation is cooperative at the database state level; external requests already in flight cannot yet be aborted.
- Provider usage metadata and a versioned pricing table are needed for billing-grade costs.
- Workflow contracts should store named artifacts so later steps can reliably consume non-adjacent outputs.
- Per-tenant WordPress/GBP credentials and managed KMS are required before broad autonomous publishing.
- Add job payload/output size limits, retention/archival and PII classification before high-volume rollout.
