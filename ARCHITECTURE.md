# UnnatiX SEO Autopilot Architecture

## Purpose and principles

UnnatiX SEO Autopilot is a multi-client local SEO operations product built with React, Vercel Serverless Functions, MongoDB, OpenAI/Gemini, WordPress, Google Business Profile, and Cloudinary. This foundation phase preserves every current screen and endpoint while introducing boundaries needed for a production multi-tenant SaaS.

The migration rules are:

1. Keep the current React application and public API paths stable.
2. Move logic behind stable adapters incrementally, with regression tests before large extractions.
3. Require organization scope on all future business-data reads and writes.
4. Keep secrets and integration credentials server-side and encrypted at rest.
5. Treat AI generation and publishing as observable jobs with idempotency and approval controls.

## Current architecture

### Frontend

- `src/App.jsx` contains navigation, all feature screens, state transitions, API calls, and most UI components.
- `src/styles.css` contains the complete visual system.
- Business workspace state and generated-title history are persisted in browser `localStorage`.
- There is no router, authenticated session, organization context, server synchronization, or automated regression suite.

### Backend

- Root `api/*.js` files are Vercel Serverless Function entrypoints.
- Handlers currently combine HTTP parsing, validation, business rules, database writes, and third-party calls.
- Shared helpers in `api/_lib` implement Mongo access, AI generation, image generation, Google OAuth, content formatting, and SEO linking.
- MongoDB is optional. Existing collections are operational run logs rather than a complete application data model.
- Daily automation runs through `/api/cron-daily` using Vercel Cron.

### Existing integrations

- OpenAI and Gemini generate content and images, with deterministic fallback content.
- WordPress REST API creates posts and media using an application password.
- Google OAuth and GBP APIs list locations and publish local posts.
- Cloudinary stores generated images.
- SMTP configuration is reported by health checks but email delivery is not yet implemented.

## Audit findings

### Security

- Authentication and authorization are absent, so mutating endpoints are public wherever the deployment is public.
- Organization ownership is not enforced in API inputs or Mongo queries.
- `/api/audit` fetches a caller-provided URL and needs DNS/IP validation to block private, loopback, metadata, redirect-based, and non-HTTP targets (SSRF).
- The Google OAuth callback stores raw access/refresh tokens and returns a refresh token in the response. Production credentials must use envelope encryption and must never be returned to the browser.
- Cron authentication is skipped when `CRON_SECRET` is absent. Production config validation now flags this condition; the endpoint itself must be changed in the authentication phase to fail closed.
- No endpoint-level rate limits, abuse quotas, CSRF strategy, or idempotency keys exist.
- Third-party fetches need consistent timeouts, response-size limits, retry policies, and sanitized errors.
- Client data in local storage is accessible to any script running in the origin and cannot enforce tenancy.

### Reliability and scale

- Scheduling up to 50 blogs sequentially performs multiple AI, image, upload, and WordPress calls inside one serverless invocation and can exceed duration limits.
- External work is not durable: there are no leases, retries, dead-letter states, or resume checkpoints.
- Large AI input/output blobs are stored inside run documents with no retention policy.
- There are no tenant compound indexes, pagination contracts, usage metering, or plan quotas.
- `App.jsx` is a large shared change surface that makes feature-level testing and ownership difficult.

## New architecture

```text
Browser
  -> React pages/modules
  -> frontend API service
  -> Vercel api/* entrypoint (stable public URL)
  -> security + request context + auth + authorization + validation
  -> backend service
  -> tenant-scoped repository/model
  -> MongoDB

Backend service
  -> integration adapter (AI / WordPress / GBP / Cloudinary / SMTP)
  -> AIJob or durable job record
  -> activity log
```

### Directory responsibilities

```text
src/
  components/    shared presentational UI
  pages/         route-level views
  hooks/         reusable stateful behavior
  services/      browser-side orchestration and transport
  api/           endpoint contracts/clients
  stores/        authenticated organization/client state
  utils/         pure utilities and browser adapters
  modules/       feature-owned UI and behavior

api/             thin Vercel entrypoints; public paths remain stable
backend/
  api/           response contracts and API-layer documentation
  services/      use cases and database lifecycle
  models/        data contracts, tenant helpers, index plans
  middleware/    security, authentication, authorization, errors
  validators/    request and tenant-context validation
  integrations/  provider adapters
  jobs/          durable async orchestration
  agents/        future constrained AI agents
  config/        environment parsing and validation
  lib/           shared errors and structured logging
```

`api/_lib/db.js` is intentionally retained as a compatibility adapter. New code should import the backend service directly; old handlers can be migrated one at a time.

## Configuration and startup policy

`backend/config/env.js` is the central typed configuration boundary. It parses booleans, integers, CSV values, and safe integration readiness flags. `validateEnvironment()` separates errors from warnings so local fallback behavior remains available while production can fail closed.

Recommended deployment validation must run before promotion and reject at least:

- `AUTH_REQUIRED=true` without a strong `JWT_SECRET` or configured identity provider.
- Production without `CRON_SECRET`.
- Invalid Mongo pool/time-out values.
- An origin allowlist that does not include the production frontend.

Secrets must not use `VITE_` prefixes because Vite exposes those values to the browser bundle.

## API contract and middleware

The target handler pipeline is:

1. Apply security headers and issue/propagate a request ID.
2. Verify the authenticated session/token.
3. resolve `userId`, `organizationId`, membership, and roles from trusted server-side data.
4. Authorize the requested organization/client action.
5. Parse a size-limited request body and validate it against an endpoint schema.
6. Run a service with explicit tenant context.
7. Return `{ ok: true, ...data }` or `{ ok: false, error, message?, details? }`.
8. Emit a structured, redacted completion/error log and a durable activity log for material actions.

Authentication middleware is currently a deliberately non-trusting placeholder. `AUTH_REQUIRED` defaults to `false` only to preserve existing functionality. It must not be enabled until real token verification and membership lookup are implemented.

## Multi-tenant MongoDB design

### Tenant boundary

`Organization` is the billing and isolation boundary. A `User` joins organizations through memberships. `Client` represents the local business being managed; `Project` provides a campaign/workstream boundary under a client.

All business documents include:

- `organizationId`: immutable tenant key.
- `createdBy`: immutable creator user ID.
- `createdAt`: creation timestamp.
- `updatedAt`: last mutation timestamp.

Business queries must be constructed with `createTenantFilter(context, filter)`. Do not accept `organizationId` from request bodies as authorization evidence. It must come from the verified session and membership lookup. Cross-tenant administrative queries must use a separately audited service path.

### Model inventory

- `User`: identity profile and organization memberships.
- `Organization`: tenant, plan, owner, and lifecycle state.
- `Client`: managed business profile.
- `Project`: client campaign/configuration boundary.
- `Audit`: website audit result and lifecycle.
- `Blog`: generated content, scheduling, and external publish state.
- `Keyword`: tracked query, location, intent, and metrics.
- `Backlink`: prospect/outreach/live-link lifecycle.
- `Review`: request and conversion lifecycle.
- `GBPPost`: draft/scheduled/published local post.
- `AIJob`: provider input/output, status, usage, and errors.
- `Integration`: provider configuration and encrypted credential envelope.
- `ActivityLog`: immutable tenant audit trail.

Definitions and compound index plans are in `backend/models/definitions.js`. Index creation is explicit in `backend/models/indexes.js`; it is not automatically run during every serverless cold start.

### Connection lifecycle

`backend/services/database.js` caches both the connection promise and resolved Mongo client on `globalThis`. This prevents connection storms during warm invocations, resets a failed promise for recovery, limits pool size, and sets server-selection, connection, and idle timeouts. Vercel instances still have independent pools, so Atlas connection limits and deployment concurrency must be sized together.

## Primary data flows

### Interactive read/write (target)

1. Browser sends an authenticated request through `apiClient`.
2. Middleware verifies identity and resolves organization membership.
3. Validator accepts only allowed fields.
4. Service creates a tenant-scoped filter/document.
5. Repository reads/writes MongoDB and records an activity event.
6. API returns a stable response; the frontend updates cached server state.

### AI generation (target)

1. Service validates tenant quota and creates a queued `AIJob`.
2. Worker claims the job using an atomic lease/idempotency key.
3. AI adapter applies provider fallback and records model/usage metadata.
4. Output is validated and written to the target `Blog`, `GBPPost`, or prospect record.
5. Job reaches succeeded/failed/retry state and emits an activity event.

### Publishing (target)

Publishing reads credentials from a tenant-scoped encrypted `Integration`, checks human approval and idempotency, calls the provider adapter, persists the external ID/status, and records an activity log. Browser requests must never contain or receive provider credentials.

## Migration phases

### Phase 1: foundation (this change)

- Central config and validation.
- Structured redacted logging and shared errors/responses.
- Security headers, bounded JSON parsing, middleware placeholders.
- Global Mongo connection cache and model/index plans.
- Frontend API/storage adapters and directory boundaries.
- No destructive data migration and no UI change.

### Phase 2: identity and tenancy (implemented)

- First-party bcrypt password authentication with short-lived signed access JWTs.
- Rotating, opaque refresh sessions stored as SHA-256 hashes in MongoDB.
- HTTP-only, SameSite cookies with configurable Secure enforcement.
- Registration, login, logout, refresh, forgot/reset password, email verification, and session lookup endpoints.
- Organization-scoped RBAC and tenant-safe client/workspace services.
- One-time, reversible browser workspace import followed by MongoDB-only persistence.
- AES-256-GCM storage for newly connected Google credentials; refresh tokens are no longer returned to browsers.

Team invitation flows, billing, managed KMS key rotation, OAuth state/PKCE, and fail-closed cron behavior remain follow-up security work.

### Phase 3: service extraction and safety

- Extract audit, content, publishing, and backlink logic into services/adapters.
- Add SSRF-safe URL fetcher, external timeouts, response limits, retries, rate limits, and idempotency.
- Add endpoint/unit/integration tests and API contract tests before splitting `App.jsx` by module.

### Phase 4: durable automation and scale

- Move long blog/image/publish workflows to durable jobs.
- Add quotas, metering, retry/backoff, leases, dead-letter handling, observability, retention policies, and per-tenant concurrency controls.

## Future AI agent integration plan

Agents should be bounded orchestrators, not privileged free-form processes. Each agent run must:

- Receive explicit `organizationId`, `clientId`, actor, objective, tool allowlist, cost limit, and expiry.
- Persist an `AIJob` before work starts and maintain lease/heartbeat state.
- Access data only through tenant-scoped services, never direct unfiltered collections.
- Validate structured model output before it becomes application data.
- Require human approval for WordPress/GBP publishing, outreach, deletion, credential changes, or spend-impacting actions.
- Use idempotency keys for every external side effect.
- Record provider/model usage, tool calls, output references, approvals, and final status in `AIJob` and `ActivityLog`.
- Support cancellation, retries, compensation, and dead-letter review.

Suggested initial agents are an audit analyst, content planner, and publishing coordinator. Keep prospect submission/outreach autonomous only after compliance rules and approval gates are proven.

## Phase 3 AI automation engine

Phase 3 implements the previously planned agent boundary under `backend/agents`. Twelve registered agents execute as tenant-scoped Mongo jobs with idempotency, atomic leases, retry/backoff, cancellation, history, persistent memory, events, schedules, cost estimates and workflow continuation. The authenticated Automation Center exposes queue status and controls without changing the existing dashboard architecture. See `AI_AGENTS.md` for lifecycle and extension contracts.

## Phase 4 SEO intelligence engine

Phase 4 adds a robots-aware, queue-executed crawler and analysis pipeline. Crawl projects persist normalized pages, links and severity-classified issues; analyzers calculate technical/content/local scores, competitor gaps, keyword opportunities, prioritized actions and a 90-day roadmap. Weekly schedules compare each run with the previous tenant/client baseline. See `SEO_INTELLIGENCE_ENGINE.md`.

## Phase 5 AI visibility engine

Phase 5 adds tenant-scoped Generative Engine Optimization monitoring. Categorized buyer queries run asynchronously through configured OpenAI and Gemini adapters. Raw response evidence, declared-brand positions, citations, provider usage and timestamped component scores remain separate and auditable. The Query Generator, Visibility Monitor and GEO Optimization agents reuse the existing queue, memory, event, retry and scheduler framework for daily sampling, weekly scoring and monthly reports. Provider secrets remain server-only and every API/collection operation enforces the authenticated organization. See `AI_VISIBILITY_ENGINE.md`.

## Phase 6 autonomous content factory

Phase 6 adds a persistent topical authority graph and approval-gated content production pipeline. Content projects produce keyword clusters, briefs, durable versioned documents, calendars, image assets, link suggestions, performance snapshots and refresh recommendations. Ten specialized agents reuse the existing queue/scheduler. WordPress verifies persisted approval state before publishing and writes the external post result back to the content document. Feedback uses imported real metrics and does not synthesize analytics. See `CONTENT_FACTORY_ENGINE.md`.

## Phase 7 local SEO command center

Phase 7 establishes canonical tenant-scoped local projects for GBP snapshots/history, reviews, local ranks, citations, NAP issues, competitors, location pages, scores and reports. Existing GBP and Review agents are reused/upgraded. Google credentials remain AES-256-GCM encrypted; OAuth state binds callback to the authenticated organization/user/client. Public NAP scans use SSRF-safe fetches, and rankings require provider observations rather than fabricated data. Daily/weekly/monthly monitoring reuses the agent scheduler. See `LOCAL_SEO_COMMAND_CENTER.md`.

## Phase 8 authority building engine

Phase 8 adds project-based backlink discovery, quality scoring, competitor evidence import, Digital PR ideation, approval-gated outreach, live-link monitoring, unlinked brand mention reclamation and authority reporting. Verified backlink records are distinct from catalog opportunities. Public monitoring uses SSRF-safe fetches; outreach delivery consumes one-time expiring tenant approvals. Monthly reports join Phase 5 GEO authority and Phase 6 topical authority signals. See `AUTHORITY_BUILDING_ENGINE.md`.

## Authentication flow

### Registration

1. `/api/auth/register` applies same-origin checks, a Mongo-backed IP rate limit, request-size limits, and input validation.
2. Password policy requires 10–128 characters with upper/lowercase and a number; bcrypt stores only a cost-configured hash.
3. The service creates an `Organization` and its `AGENCY_OWNER` user. Unique email and organization slug indexes prevent conflicts.
4. A verification token is generated with cryptographic randomness; only its SHA-256 hash and expiry are stored.
5. SMTP sends the verification link when configured.
6. A short-lived access JWT and rotating refresh token are issued as HTTP-only cookies.

### Login and refresh

1. Login compares the bcrypt hash using a generic invalid-credentials response and creates a Mongo `sessions` record.
2. Access JWT claims contain `sub` (user), `org` (organization), `role`, `sid`, issuer, issued time, expiry, and unique token ID.
3. The access cookie defaults to 15 minutes. The refresh cookie defaults to 30 days.
4. `/api/auth/refresh` matches a hashed opaque token and atomically rotates it. Expired/revoked sessions are rejected.
5. Frontend API transport performs one shared refresh attempt on 401 and retries the original request once.
6. Logout revokes the Mongo session and clears both cookies.

### Password reset and email verification

Reset and verification tokens are single-use, random, hashed at rest, time-limited, and invalidated after use. Password reset revokes all active user sessions. Forgot-password responses never disclose whether an email exists.

## Database relationships

```text
Organization 1 ── * User
Organization 1 ── * Client
Organization 1 ── 1 ClientWorkspace
Organization 1 ── * Session
Organization 1 ── * ActivityLog
Client       1 ── * Audit / Blog / Keyword / Backlink / Review / GBPPost
User         1 ── * Session / AuthToken / created business records
```

`organizationId` comes only from a verified access token. API bodies cannot select a tenant. Client IDs are always combined with the authenticated organization filter. `SUPER_ADMIN` does not automatically bypass tenant filters; cross-tenant administration requires a future separately audited control plane.

## RBAC model

- `SUPER_ADMIN`: permission catalog available, but no implicit cross-tenant data access.
- `AGENCY_OWNER`: billing, team, clients, SEO, content, publishing, and reports.
- `AGENCY_ADMIN`: agency operations except billing.
- `SEO_MANAGER`: client SEO management, audits, generation, publishing, and reports.
- `SEO_EXECUTIVE`: audits, SEO execution, generation, writing, and reports.
- `CONTENT_WRITER`: content generation/writing and reports.
- `CLIENT`: client/report reads only; workspace mutations are rejected server-side.

Permissions are centralized in `backend/security/permissions.js` and enforced by `withApiHandler` or explicit method-level checks for mixed read/write endpoints.

## Workspace persistence migration

The dashboard retains its existing state shape and feature components. On authenticated startup it loads `/api/workspace`. If the organization has no server workspace, the app imports the old `unnatix-seo-autopilot-live-v2` value once; otherwise it initializes the existing seed workspace. All subsequent mutations pass through a 600 ms debounced tenant-scoped Mongo save. The old local value is retained only as a recovery backup and is no longer read after a server workspace exists.

## Phase 2 security notes

- Auth endpoints use database-backed rate limits that work across serverless instances.
- Cookies are HTTP-only, SameSite=Lax, and configurable as Secure; production must set `SECURE_COOKIES=true`.
- Unsafe browser requests enforce an origin allowlist.
- Logs redact password/token/secret/key fields.
- New Google OAuth credentials use AES-256-GCM and are never returned in API responses.
- `JWT_SECRET` and `INTEGRATION_ENCRYPTION_KEY` require at least 32 characters in production validation.
- Authentication makes MongoDB mandatory for dashboard use.
- Existing integration credentials remain deployment-wide environment variables until per-tenant integration adapters are completed.
