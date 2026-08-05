# Local SEO Command Center

## Architecture

```text
Local SEO Command Center
 -> authenticated tenant API + rate limit + activity log
 -> Mongo agent queue/scheduler
 -> encrypted tenant Google OAuth -> GBP sync snapshots/change history
 -> reviews / ranks / citations / NAP / competitors / location pages
 -> weighted Local SEO score -> monthly client report
```

The implementation upgrades the existing GBP and Review modules. Legacy workspace reviews and posts remain unchanged; canonical Phase 7 records live in tenant collections and can be backfilled later after source identity matching.

## Agents

- GBP Optimization Agent: sync, profile completeness, categories/services/attributes, photo/post frequency and review velocity.
- Local Rank Agent: local-pack/organic observations by keyword, location and coordinates with movement history.
- Citation Management Agent: local, directory, chamber, association and partner opportunities/statuses.
- NAP Checker Agent: SSRF-safe scans of explicitly supplied public URLs against canonical name/address/phone/website.
- Review Agent (upgraded): personalized WhatsApp/email requests, reminders, sentiment themes and owner replies.
- Local Competitor Agent: compares supplied GBP observations for reviews, rating, photos, posts, categories and services.
- Location Page Agent: idempotent service/location drafts with local structure, FAQ, schema and internal links.
- Local SEO Report Agent: score factors, rank movement, review gain, GBP changes, citation progress and next actions.

## Database

Collections: `localSeoProjects`, `gbpProfiles`, `gbpProfileHistory`, `localKeywords`, `localRankHistory`, `citationRecords`, `reviewRecords`, `napIssues`, `localCompetitorSnapshots`, `locationPages`, `localSeoScores`, `localSeoReports`, and `localRecommendations`. Every business document is scoped by `organizationId`; compound indexes cover client/location/project/status/history access.

## GBP workflow and security

OAuth credentials are AES-256-GCM encrypted. The OAuth state is HMAC-signed, expires after ten minutes, and binds organization, user and optional client. Sync decrypts the latest tenant credential on the server, refreshes access tokens, stores encrypted replacements and never returns secrets. Business information, reviews and posts are fetched independently so a partial API failure is visible without discarding successful data. Every sync stores a snapshot and field-level changes.

GBP APIs and permissions vary by account and enabled Google API. Photos and performance insights remain stored when supplied/available; future adapters can add the current Business Profile Performance and media endpoints without changing the profile model.

## Local ranking and competitor evidence

Google does not provide a general local-pack rank API in this project. `LocalRankAgent` accepts observations from a configured future provider or manual import, stores provider identity and never fabricates positions. Scheduled weekly jobs remain ready but return `provider_required` until observations are delivered. Competitor comparisons similarly use supplied observations rather than scraping protected Google result pages.

## Local SEO scoring

The 0–100 score weights GBP completeness 25%, reviews/velocity 20%, citation consistency 15%, tracked rankings 20%, Phase 4 website local signals 10%, and approved/published location-page coverage 10%. Every component is persisted separately.

## Automation

- Daily: GBP profile/change/review sync and optimization.
- Weekly: rank-provider observation processing and citation opportunity refresh.
- Monthly: Local SEO score and client report.

Schedules are idempotent and use the existing Mongo scheduler/worker. Vercel cron must tick due schedules and process queued jobs.

## Future roadmap

Add Business Profile Performance/media adapters, encrypted per-location tokens, webhook review notifications, DataForSEO/Places Scout rank adapters, citation verification crawls, duplicate-listing vendor APIs, bulk location-page approval/publishing, Search Console local-page feedback, white-label PDF/email delivery and agency usage quotas.
