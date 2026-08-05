# Backlink Intelligence, Digital PR and Authority Building Engine

## Architecture

```text
Authority Center -> tenant/RBAC/rate-limited API -> agent queue
  -> Discovery + quality scoring
  -> competitor provider observations -> authority gap
  -> Digital PR ideas -> outreach draft -> one-time approved delivery
  -> verified backlink records -> daily safe monitor
  -> supplied mention URLs -> reclamation opportunities
  -> Content Factory + GEO signals -> monthly authority report
```

Legacy `backlinks` and `backlinkAutopilotRuns` remain unchanged. New canonical projects do not treat catalog suggestions as acquired links; only imported/monitored evidence enters `backlinkRecords`.

## Agents

- Backlink Discovery Agent: industry/local directories, partners, resources, guest posts, associations and media leads.
- Competitor Backlink Agent: common linking domains, linked content, PR, guest-post and citation observations from a configured provider/import.
- Digital PR Agent: original research, expert commentary, data studies, founder interviews, podcasts and webinars.
- Authority Outreach Agent: personalized email, LinkedIn and two follow-ups based on site/author/history.
- Backlink Monitor Agent: HTTP/link existence, anchor, placement and follow/nofollow changes.
- Brand Mention Agent: company/founder/product mentions across explicitly supplied news/blog/forum/social URLs and unlinked reclamation.
- Authority Report Agent: new/lost links, score changes, PR/outreach and cross-engine next actions.

## Database

Collections: `backlinkProjects`, `backlinkOpportunities`, `backlinkRecords`, `outreachCampaigns`, `digitalPrOpportunities`, `brandMentions`, `authorityScores`, `authorityReports`, `authorityRecommendations`, `competitorBacklinkAnalyses`, and short-lived `outreachSendApprovals`. Every business record is tenant scoped. Compound unique indexes prevent duplicate project opportunities and source-target records; send approvals expire through TTL.

## Scoring logic

Opportunity Authority Score (0–100): domain authority 25%, link/domain relevance 20%, traffic estimate 15%, industry relevance 20%, spam safety 15%, and placement quality 5%. Factor values are persisted. Catalog numbers are qualification estimates and must be verified before outreach.

The project Authority Growth Score combines average verified-link quality (45%), referring-domain diversity (25%), new-link velocity (15%), and linked brand mentions (15%). Reports retain every component and baseline change.

## Workflows

```text
identified -> qualified -> outreach/submitted -> won/rejected
draft campaign -> explicit send approval -> sent -> follow-up -> response -> link acquired
live backlink -> daily check -> live/lost/broken/check_failed
mention found -> backlink absent -> reclamation opportunity
```

Outreach sends require a user with `publish` permission. The API creates a tenant/project-bound approval that expires in 15 minutes; the agent atomically consumes it once. Each live approval permits exactly one recipient, with at most 25 approved sends per tenant/day; bulk lists remain draft-only. Generic agent queue calls cannot set `sendApproved` directly. SMTP credentials remain server-only. Delivery is activity logged.

## Internal authority flow

Monthly reporting reads the latest GEO authority score and Content Factory topical authority score. Low GEO authority recommends original research/press signals; weak topical coverage recommends strengthening the link-worthy pillar before outreach. Lost links and unlinked mentions become reclamation actions.

## Automation

- Daily: verify stored backlinks and scan configured mention URLs.
- Weekly: refresh discovery and process competitor-provider observations.
- Monthly: authority growth score/report and cross-engine recommendations.

Schedules reuse the Mongo agent scheduler and require the Vercel worker/cron to tick and execute due jobs. Without backlink/mention providers, scheduled competitor/mention tasks return empty/provider-required evidence rather than fabricated results.

## Future extensions

Add Ahrefs/Semrush/Moz/DataForSEO adapters, journalist databases, email reply webhooks, bounce/unsubscribe/suppression handling, mailbox threading, social listening APIs, placement screenshots, link-index reconciliation, anchor-risk analysis, distributed monitoring, white-label reports, approval notifications and billing quotas.
