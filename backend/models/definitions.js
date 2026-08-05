const tenantFields = Object.freeze({
  organizationId: { type: "objectId", required: true, immutable: true },
  createdBy: { type: "objectId", required: true, immutable: true },
  createdAt: { type: "date", required: true },
  updatedAt: { type: "date", required: true },
});

const globalFields = Object.freeze({ createdAt: { type: "date", required: true }, updatedAt: { type: "date", required: true } });

function tenantModel(collection, fields, indexes = []) {
  return Object.freeze({ collection, tenantScoped: true, fields: Object.freeze({ ...tenantFields, ...fields }), indexes: Object.freeze(indexes) });
}

function globalModel(collection, fields, indexes = []) {
  return Object.freeze({ collection, tenantScoped: false, fields: Object.freeze({ ...globalFields, ...fields }), indexes: Object.freeze(indexes) });
}

export const modelDefinitions = Object.freeze({
  User: globalModel("users", {
    email: { type: "string", required: true, normalize: "lowercase" },
    name: { type: "string", required: true },
    passwordHash: { type: "string", required: true, sensitive: true },
    organizationId: { type: "objectId", required: true },
    role: { type: "string", required: true },
    status: { type: "string", enum: ["active", "invited", "disabled"] },
    emailVerified: { type: "boolean" }, lastLogin: { type: "date" },
  }, [{ key: { email: 1 }, unique: true }, { key: { organizationId: 1, role: 1 } }]),

  Organization: globalModel("organizations", {
    name: { type: "string", required: true }, slug: { type: "string", required: true },
    ownerId: { type: "objectId", required: true }, plan: { type: "string" }, settings: { type: "object" },
  }, [{ key: { slug: 1 }, unique: true }, { key: { ownerId: 1 } }]),

  Client: tenantModel("clients", {
    businessName: { type: "string", required: true }, category: { type: "string" }, city: { type: "string" },
    website: { type: "string" }, services: { type: "array" }, goals: { type: "array" }, googleReviewLink: { type: "string" }, phone: { type: "string" }, email: { type: "string" },
  }, [{ key: { organizationId: 1, businessName: 1 } }]),

  Project: tenantModel("projects", {
    clientId: { type: "objectId", required: true }, name: { type: "string", required: true },
    type: { type: "string" }, status: { type: "string" }, settings: { type: "object" },
  }, [{ key: { organizationId: 1, clientId: 1 } }]),

  Audit: tenantModel("audits", {
    clientId: { type: "objectId", required: true }, projectId: { type: "objectId" }, url: { type: "string", required: true },
    score: { type: "number" }, issues: { type: "array" }, result: { type: "object" }, status: { type: "string" },
  }, [{ key: { organizationId: 1, clientId: 1, createdAt: -1 } }]),

  Blog: tenantModel("blogs", {
    clientId: { type: "objectId", required: true }, projectId: { type: "objectId" }, title: { type: "string", required: true },
    slug: { type: "string" }, content: { type: "string" }, status: { type: "string" }, scheduledAt: { type: "date" }, externalPostId: { type: "string" },
  }, [{ key: { organizationId: 1, clientId: 1, status: 1 } }, { key: { organizationId: 1, clientId: 1, slug: 1 }, unique: true, sparse: true }]),

  Keyword: tenantModel("keywords", {
    clientId: { type: "objectId", required: true }, projectId: { type: "objectId" }, keyword: { type: "string", required: true },
    searchIntent: { type: "string" }, difficulty: { type: "number" }, priority: { type: "number" }, location: { type: "string" }, service: { type: "string" }, status: { type: "string" }, metrics: { type: "object" },
  }, [{ key: { organizationId: 1, clientId: 1, keyword: 1, location: 1 }, unique: true }]),

  Backlink: tenantModel("backlinks", {
    clientId: { type: "objectId", required: true }, projectId: { type: "objectId" }, site: { type: "string", required: true },
    url: { type: "string" }, authority: { type: "number" }, status: { type: "string" }, outreach: { type: "object" },
  }, [{ key: { organizationId: 1, clientId: 1, status: 1 } }]),

  Review: tenantModel("reviews", {
    clientId: { type: "objectId", required: true }, customerName: { type: "string" }, phone: { type: "string" },
    rating: { type: "number" }, status: { type: "string" }, requestedAt: { type: "date" }, reviewedAt: { type: "date" },
  }, [{ key: { organizationId: 1, clientId: 1, status: 1 } }]),

  GBPPost: tenantModel("gbpPosts", {
    clientId: { type: "objectId", required: true }, summary: { type: "string", required: true }, status: { type: "string" },
    scheduledAt: { type: "date" }, publishedAt: { type: "date" }, externalPostId: { type: "string" }, media: { type: "array" },
  }, [{ key: { organizationId: 1, clientId: 1, status: 1, scheduledAt: 1 } }]),

  AIJob: tenantModel("aiJobs", {
    clientId: { type: "objectId" }, type: { type: "string", required: true }, provider: { type: "string" }, model: { type: "string" },
    status: { type: "string" }, input: { type: "object" }, output: { type: "object" }, error: { type: "object" }, usage: { type: "object" }, startedAt: { type: "date" }, finishedAt: { type: "date" },
  }, [{ key: { organizationId: 1, status: 1, createdAt: -1 } }, { key: { organizationId: 1, clientId: 1, type: 1, createdAt: -1 } }]),

  Integration: tenantModel("integrations", {
    clientId: { type: "objectId" }, provider: { type: "string", required: true }, status: { type: "string" },
    encryptedCredentials: { type: "object" }, settings: { type: "object" }, lastSyncedAt: { type: "date" },
  }, [{ key: { organizationId: 1, clientId: 1, provider: 1 }, unique: true }]),

  ActivityLog: tenantModel("activityLogs", {
    userId: { type: "objectId" }, action: { type: "string", required: true }, metadata: { type: "object" }, timestamp: { type: "date", required: true },
  }, [{ key: { organizationId: 1, createdAt: -1 } }, { key: { organizationId: 1, entityType: 1, entityId: 1 } }]),

  Session: tenantModel("sessions", { userId: { type: "objectId", required: true }, refreshTokenHash: { type: "string", required: true, sensitive: true }, expiresAt: { type: "date", required: true }, revokedAt: { type: "date" } }, [{ key: { refreshTokenHash: 1 }, unique: true }, { key: { expiresAt: 1 }, expireAfterSeconds: 0 }]),
  AuthToken: tenantModel("authTokens", { userId: { type: "objectId", required: true }, type: { type: "string", required: true }, tokenHash: { type: "string", required: true, sensitive: true }, expiresAt: { type: "date", required: true }, usedAt: { type: "date" } }, [{ key: { tokenHash: 1 }, unique: true }, { key: { expiresAt: 1 }, expireAfterSeconds: 0 }]),
  ClientWorkspace: tenantModel("clientWorkspaces", { activeClientId: { type: "string" }, reviews: { type: "object" }, posts: { type: "object" }, backlinks: { type: "object" }, contentIdeas: { type: "object" }, health: { type: "object" }, blogSchedules: { type: "object" }, usedTitles: { type: "array" } }, [{ key: { organizationId: 1 }, unique: true }]),
  AgentJob: tenantModel("agentJobs", { clientId: { type: "objectId" }, agentId: { type: "string", required: true }, status: { type: "string", required: true }, input: { type: "object" }, output: { type: "object" }, error: { type: "object" }, attempts: { type: "number" }, maxRetries: { type: "number" }, idempotencyKey: { type: "string" }, scheduledFor: { type: "date" }, startedAt: { type: "date" }, finishedAt: { type: "date" }, metrics: { type: "object" }, history: { type: "array" }, workflow: { type: "object" } }, [{ key: { organizationId: 1, status: 1, scheduledFor: 1 } }, { key: { organizationId: 1, idempotencyKey: 1, status: 1 } }]),
  AgentMemory: tenantModel("agentMemory", { clientId: { type: "objectId" }, agentId: { type: "string", required: true }, memory: { type: "object" } }, [{ key: { organizationId: 1, clientId: 1, agentId: 1 }, unique: true }]),
  AgentEvent: tenantModel("agentEvents", { clientId: { type: "objectId" }, name: { type: "string", required: true }, payload: { type: "object" } }, [{ key: { organizationId: 1, createdAt: -1 } }]),
  AgentSchedule: tenantModel("agentSchedules", { clientId: { type: "objectId" }, agentId: { type: "string", required: true }, input: { type: "object" }, runAt: { type: "date" }, recurrence: { type: "object" }, status: { type: "string" } }, [{ key: { organizationId: 1, status: 1, runAt: 1 } }]),
  WorkflowRun: tenantModel("workflowRuns", { clientId: { type: "objectId" }, workflowId: { type: "string", required: true }, status: { type: "string" }, currentStep: { type: "number" }, input: { type: "object" }, outputs: { type: "array" } }, [{ key: { organizationId: 1, status: 1, createdAt: -1 } }]),
  Notification: tenantModel("notifications", { clientId: { type: "objectId" }, title: { type: "string" }, message: { type: "string" }, channels: { type: "array" }, status: { type: "string" }, readAt: { type: "date" } }, [{ key: { organizationId: 1, readAt: 1, createdAt: -1 } }]),
  CrawlProject: tenantModel("crawlProjects", { clientId: { type: "objectId" }, rootUrl: { type: "string", required: true }, status: { type: "string" }, maxPages: { type: "number" }, summary: { type: "object" }, intelligence: { type: "object" }, changes: { type: "object" }, startedAt: { type: "date" }, completedAt: { type: "date" } }, [{ key: { organizationId: 1, clientId: 1, createdAt: -1 } }]),
  CrawledPage: tenantModel("crawledPages", { clientId: { type: "objectId" }, projectId: { type: "objectId", required: true }, url: { type: "string", required: true }, finalUrl: { type: "string" }, status: { type: "number" }, title: { type: "string" }, description: { type: "string" }, canonical: { type: "string" }, headings: { type: "object" }, images: { type: "array" }, schemaAnalysis: { type: "object" }, metadata: { type: "object" }, wordCount: { type: "number" }, durationMs: { type: "number" } }, [{ key: { organizationId: 1, projectId: 1, url: 1 }, unique: true }]),
  InternalLink: tenantModel("internalLinks", { clientId: { type: "objectId" }, projectId: { type: "objectId", required: true }, sourceUrl: { type: "string" }, targetUrl: { type: "string" }, anchor: { type: "string" }, internal: { type: "boolean" }, broken: { type: "boolean" } }, [{ key: { organizationId: 1, projectId: 1, sourceUrl: 1 } }]),
  CrawlIssue: tenantModel("crawlIssues", { clientId: { type: "objectId" }, projectId: { type: "objectId", required: true }, url: { type: "string" }, type: { type: "string" }, severity: { type: "string" }, message: { type: "string" }, status: { type: "string" } }, [{ key: { organizationId: 1, projectId: 1, severity: 1, status: 1 } }]),
  SeoOpportunity: tenantModel("seoOpportunities", { clientId: { type: "objectId" }, projectId: { type: "objectId" }, issue: { type: "string" }, reason: { type: "string" }, impact: { type: "string" }, priority: { type: "string" }, suggestedAction: { type: "string" }, status: { type: "string" } }, [{ key: { organizationId: 1, clientId: 1, status: 1, createdAt: -1 } }]),
  CompetitorAnalysis: tenantModel("competitorAnalyses", { clientId: { type: "objectId" }, projectId: { type: "objectId" }, comparison: { type: "object" } }, [{ key: { organizationId: 1, clientId: 1, createdAt: -1 } }]),
  SeoStrategy: tenantModel("seoStrategies", { clientId: { type: "objectId" }, projectId: { type: "objectId" }, overview: { type: "object" }, technical: { type: "object" }, onPage: { type: "object" }, competitor: { type: "object" }, keywords: { type: "array" }, opportunities: { type: "array" }, strategy: { type: "object" }, changes: { type: "object" } }, [{ key: { organizationId: 1, clientId: 1, createdAt: -1 } }]),
  AIVisibilityProject: tenantModel("aiVisibilityProjects", { clientId: { type: "objectId", required: true }, brandName: { type: "string", required: true }, industry: { type: "string" }, locations: { type: "array" }, services: { type: "array" }, competitors: { type: "array" }, targetCustomers: { type: "array" }, trackedQueries: { type: "array" }, status: { type: "string" }, lastScore: { type: "number" }, lastRunAt: { type: "date" } }, [{ key: { organizationId: 1, clientId: 1, updatedAt: -1 } }]),
  AIQueryTracking: tenantModel("aiQueryTracking", { clientId: { type: "objectId" }, projectId: { type: "objectId", required: true }, query: { type: "string", required: true }, category: { type: "string" }, location: { type: "string" }, intent: { type: "string" } }, [{ key: { organizationId: 1, projectId: 1, query: 1 }, unique: true }]),
  AIResponseRecord: tenantModel("aiResponseRecords", { clientId: { type: "objectId" }, projectId: { type: "objectId", required: true }, queryId: { type: "objectId", required: true }, query: { type: "string" }, provider: { type: "string" }, model: { type: "string" }, responseText: { type: "string" }, mentionedBrands: { type: "array" }, citations: { type: "array" }, usage: { type: "object" }, timestamp: { type: "date" } }, [{ key: { organizationId: 1, projectId: 1, queryId: 1, provider: 1, timestamp: -1 } }]),
  AIVisibilityScore: tenantModel("aiVisibilityScores", { clientId: { type: "objectId" }, projectId: { type: "objectId", required: true }, overallScore: { type: "number" }, brandMentionScore: { type: "number" }, citationScore: { type: "number" }, authorityScore: { type: "number" }, contentCoverageScore: { type: "number" }, competitorGapScore: { type: "number" }, platformScores: { type: "array" }, timestamp: { type: "date" } }, [{ key: { organizationId: 1, projectId: 1, timestamp: -1 } }]),
  EntityProfile: tenantModel("entityProfiles", { clientId: { type: "objectId", required: true }, businessName: { type: "string" }, founder: { type: "string" }, services: { type: "array" }, locations: { type: "array" }, socialProfiles: { type: "array" }, reviews: { type: "object" }, awards: { type: "array" }, publications: { type: "array" }, caseStudies: { type: "array" } }, [{ key: { organizationId: 1, clientId: 1 }, unique: true }]),
  GEORecommendation: tenantModel("geoRecommendations", { clientId: { type: "objectId" }, projectId: { type: "objectId", required: true }, title: { type: "string" }, action: { type: "string" }, priority: { type: "string" }, category: { type: "string" }, status: { type: "string" } }, [{ key: { organizationId: 1, projectId: 1, status: 1 } }]),
  AIUsageLog: tenantModel("aiUsageLogs", { clientId: { type: "objectId" }, projectId: { type: "objectId" }, queryId: { type: "objectId" }, provider: { type: "string" }, model: { type: "string" }, usage: { type: "object" }, estimatedCost: { type: "number" }, status: { type: "string" }, timestamp: { type: "date" } }, [{ key: { organizationId: 1, timestamp: -1 } }]),
  ContentProject: tenantModel("contentProjects", { clientId: { type: "objectId", required: true }, brandName: { type: "string" }, industry: { type: "string", required: true }, services: { type: "array" }, locations: { type: "array" }, targetAudience: { type: "string" }, brandTone: { type: "string" }, competitors: { type: "array" }, authorityScore: { type: "number" }, status: { type: "string" } }, [{ key: { organizationId: 1, clientId: 1, updatedAt: -1 } }]),
  KeywordCluster: tenantModel("keywordClusters", { clientId: { type: "objectId" }, projectId: { type: "objectId", required: true }, topic: { type: "string" }, primaryKeyword: { type: "string", required: true }, secondaryKeywords: { type: "array" }, searchIntent: { type: "string" }, difficulty: { type: "number" }, priority: { type: "number" }, businessValue: { type: "string" }, contentType: { type: "string" }, targetPage: { type: "string" }, status: { type: "string" } }, [{ key: { organizationId: 1, projectId: 1, primaryKeyword: 1 }, unique: true }]),
  ContentBrief: tenantModel("contentBriefs", { clientId: { type: "objectId" }, projectId: { type: "objectId" }, clusterId: { type: "objectId", required: true }, title: { type: "string" }, keyword: { type: "string" }, intent: { type: "string" }, audience: { type: "string" }, outline: { type: "array" }, questions: { type: "array" }, competitorReferences: { type: "array" }, recommendedLength: { type: "number" } }, [{ key: { organizationId: 1, clusterId: 1 }, unique: true }]),
  ContentDocument: tenantModel("contentDocuments", { clientId: { type: "objectId", required: true }, projectId: { type: "objectId" }, clusterId: { type: "objectId" }, briefId: { type: "objectId" }, title: { type: "string" }, slug: { type: "string" }, content: { type: "string" }, status: { type: "string" }, workflow: { type: "object" }, version: { type: "number" }, optimization: { type: "object" }, wordpress: { type: "object" }, publishedAt: { type: "date" } }, [{ key: { organizationId: 1, clientId: 1, slug: 1 }, unique: true }, { key: { organizationId: 1, projectId: 1, status: 1 } }]),
  ContentPerformance: tenantModel("contentPerformances", { clientId: { type: "objectId" }, projectId: { type: "objectId" }, contentId: { type: "objectId", required: true }, source: { type: "string" }, traffic: { type: "number" }, ranking: { type: "number" }, clicks: { type: "number" }, impressions: { type: "number" }, conversions: { type: "number" }, lastChecked: { type: "date" } }, [{ key: { organizationId: 1, contentId: 1, lastChecked: -1 } }]),
  ContentCalendar: tenantModel("contentCalendars", { clientId: { type: "objectId" }, projectId: { type: "objectId" }, clusterId: { type: "objectId" }, title: { type: "string" }, publishAt: { type: "date" }, priority: { type: "number" }, seasonality: { type: "string" }, status: { type: "string" } }, [{ key: { organizationId: 1, projectId: 1, publishAt: 1 } }]),
  ContentImage: tenantModel("contentImages", { clientId: { type: "objectId" }, projectId: { type: "objectId" }, contentId: { type: "objectId", required: true }, type: { type: "string" }, cloudinaryUrl: { type: "string" }, prompt: { type: "string" }, altText: { type: "string" }, imageTitle: { type: "string" }, metadata: { type: "object" } }, [{ key: { organizationId: 1, contentId: 1, type: 1 } }]),
  InternalLinkSuggestion: tenantModel("internalLinkSuggestions", { clientId: { type: "objectId" }, projectId: { type: "objectId" }, sourceContentId: { type: "objectId" }, targetContentId: { type: "objectId" }, sourcePage: { type: "string" }, targetPage: { type: "string" }, anchorText: { type: "string" }, reason: { type: "string" }, confidence: { type: "number" }, status: { type: "string" } }, [{ key: { organizationId: 1, projectId: 1, status: 1 } }]),
  ContentRecommendation: tenantModel("contentRecommendations", { clientId: { type: "objectId" }, projectId: { type: "objectId" }, contentId: { type: "objectId" }, type: { type: "string" }, title: { type: "string" }, reasons: { type: "array" }, actions: { type: "array" }, priority: { type: "string" }, status: { type: "string" } }, [{ key: { organizationId: 1, projectId: 1, status: 1 } }]),
  LocalSEOProject: tenantModel("localSeoProjects", { clientId: { type: "objectId", required: true }, businessName: { type: "string", required: true }, category: { type: "string" }, locations: { type: "array" }, services: { type: "array" }, targetKeywords: { type: "array" }, competitors: { type: "array" }, accountId: { type: "string" }, locationId: { type: "string" }, address: { type: "string" }, phone: { type: "string" }, website: { type: "string" } }, [{ key: { organizationId: 1, clientId: 1, updatedAt: -1 } }]),
  GBPProfile: tenantModel("gbpProfiles", { clientId: { type: "objectId", required: true }, projectId: { type: "objectId" }, accountId: { type: "string" }, locationId: { type: "string" }, businessName: { type: "string" }, address: { type: "object" }, phone: { type: "string" }, category: { type: "object" }, website: { type: "string" }, hours: { type: "object" }, attributes: { type: "object" }, photos: { type: "array" }, posts: { type: "array" }, reviews: { type: "array" }, lastSync: { type: "date" } }, [{ key: { organizationId: 1, clientId: 1, locationId: 1 }, unique: true }]),
  GBPProfileHistory: tenantModel("gbpProfileHistory", { clientId: { type: "objectId" }, projectId: { type: "objectId" }, profileId: { type: "objectId" }, changes: { type: "array" }, lastSync: { type: "date" } }, [{ key: { organizationId: 1, projectId: 1, createdAt: -1 } }]),
  LocalKeyword: tenantModel("localKeywords", { clientId: { type: "objectId" }, projectId: { type: "objectId", required: true }, keyword: { type: "string" }, location: { type: "string" }, searchIntent: { type: "string" }, currentPosition: { type: "number" }, previousPosition: { type: "number" }, targetPosition: { type: "number" }, trackingFrequency: { type: "string" }, coordinates: { type: "object" }, lastChecked: { type: "date" } }, [{ key: { organizationId: 1, projectId: 1, keyword: 1, location: 1 }, unique: true }]),
  LocalRankHistory: tenantModel("localRankHistory", { clientId: { type: "objectId" }, projectId: { type: "objectId" }, keywordId: { type: "objectId" }, keyword: { type: "string" }, location: { type: "string" }, currentPosition: { type: "number" }, previousPosition: { type: "number" }, movement: { type: "number" }, localPackPosition: { type: "number" }, organicPosition: { type: "number" }, checkedAt: { type: "date" } }, [{ key: { organizationId: 1, keywordId: 1, checkedAt: -1 } }]),
  CitationRecord: tenantModel("citationRecords", { clientId: { type: "objectId", required: true }, projectId: { type: "objectId" }, platform: { type: "string" }, url: { type: "string" }, businessName: { type: "string" }, address: { type: "string" }, phone: { type: "string" }, status: { type: "string" }, authorityScore: { type: "number" }, napConsistent: { type: "boolean" } }, [{ key: { organizationId: 1, clientId: 1, platform: 1, url: 1 }, unique: true }]),
  ReviewRecord: tenantModel("reviewRecords", { clientId: { type: "objectId", required: true }, projectId: { type: "objectId" }, customerName: { type: "string" }, rating: { type: "number" }, reviewText: { type: "string" }, source: { type: "string" }, responseStatus: { type: "string" }, aiReply: { type: "string" }, sentiment: { type: "object" }, externalId: { type: "string" } }, [{ key: { organizationId: 1, clientId: 1, createdAt: -1 } }]),
  NAPIssue: tenantModel("napIssues", { clientId: { type: "objectId" }, projectId: { type: "objectId" }, url: { type: "string" }, type: { type: "string" }, fields: { type: "array" }, severity: { type: "string" }, suggestedFix: { type: "string" }, status: { type: "string" } }, [{ key: { organizationId: 1, projectId: 1, status: 1 } }]),
  LocalCompetitorSnapshot: tenantModel("localCompetitorSnapshots", { clientId: { type: "objectId" }, projectId: { type: "objectId" }, client: { type: "object" }, comparisons: { type: "array" } }, [{ key: { organizationId: 1, projectId: 1, createdAt: -1 } }]),
  LocationPage: tenantModel("locationPages", { clientId: { type: "objectId" }, projectId: { type: "objectId" }, service: { type: "string" }, location: { type: "string" }, title: { type: "string" }, slug: { type: "string" }, content: { type: "string" }, localEntities: { type: "array" }, faq: { type: "array" }, schema: { type: "object" }, internalLinks: { type: "array" }, status: { type: "string" }, workflow: { type: "object" } }, [{ key: { organizationId: 1, projectId: 1, service: 1, location: 1 }, unique: true }]),
  LocalSEOScore: tenantModel("localSeoScores", { clientId: { type: "objectId" }, projectId: { type: "objectId" }, overallScore: { type: "number" }, factors: { type: "object" }, reviewVelocity90Days: { type: "number" }, timestamp: { type: "date" } }, [{ key: { organizationId: 1, projectId: 1, timestamp: -1 } }]),
  LocalSEOReport: tenantModel("localSeoReports", { clientId: { type: "objectId" }, projectId: { type: "objectId" }, score: { type: "object" }, rankingChanges: { type: "array" }, reviewsGained90Days: { type: "number" }, gbpChanges: { type: "array" }, citationProgress: { type: "object" }, nextActions: { type: "array" } }, [{ key: { organizationId: 1, projectId: 1, createdAt: -1 } }]),
  LocalRecommendation: tenantModel("localRecommendations", { clientId: { type: "objectId" }, projectId: { type: "objectId" }, type: { type: "string" }, action: { type: "string" }, priority: { type: "string" }, status: { type: "string" } }, [{ key: { organizationId: 1, projectId: 1, status: 1 } }]),
  BacklinkProject: tenantModel("backlinkProjects", { clientId: { type: "objectId", required: true }, targetWebsite: { type: "string", required: true }, brandName: { type: "string" }, founderName: { type: "string" }, products: { type: "array" }, industry: { type: "string" }, locations: { type: "array" }, services: { type: "array" }, competitors: { type: "array" } }, [{ key: { organizationId: 1, clientId: 1, updatedAt: -1 } }]),
  BacklinkOpportunity: tenantModel("backlinkOpportunities", { clientId: { type: "objectId" }, projectId: { type: "objectId", required: true }, domain: { type: "string" }, url: { type: "string" }, sourceType: { type: "string" }, authorityScore: { type: "number" }, relevanceScore: { type: "number" }, spamScore: { type: "number" }, estimatedValue: { type: "string" }, status: { type: "string" }, priority: { type: "string" }, notes: { type: "string" } }, [{ key: { organizationId: 1, projectId: 1, domain: 1, url: 1 }, unique: true }]),
  BacklinkRecord: tenantModel("backlinkRecords", { clientId: { type: "objectId", required: true }, projectId: { type: "objectId" }, sourceDomain: { type: "string" }, sourceURL: { type: "string" }, targetURL: { type: "string" }, anchorText: { type: "string" }, linkType: { type: "string" }, placement: { type: "string" }, authorityScore: { type: "number" }, status: { type: "string" }, firstSeen: { type: "date" }, lastChecked: { type: "date" } }, [{ key: { organizationId: 1, clientId: 1, sourceURL: 1, targetURL: 1 }, unique: true }]),
  OutreachCampaign: tenantModel("outreachCampaigns", { clientId: { type: "objectId" }, projectId: { type: "objectId" }, campaignName: { type: "string" }, prospects: { type: "array" }, emails: { type: "array" }, status: { type: "string" }, responses: { type: "array" } }, [{ key: { organizationId: 1, projectId: 1, status: 1, createdAt: -1 } }]),
  DigitalPROpportunity: tenantModel("digitalPrOpportunities", { clientId: { type: "objectId" }, projectId: { type: "objectId" }, type: { type: "string" }, idea: { type: "string" }, targetPublication: { type: "string" }, pitchAngle: { type: "string" }, expectedImpact: { type: "string" }, status: { type: "string" } }, [{ key: { organizationId: 1, projectId: 1, status: 1 } }]),
  BrandMention: tenantModel("brandMentions", { clientId: { type: "objectId" }, projectId: { type: "objectId" }, url: { type: "string" }, sourceDomain: { type: "string" }, mentionedEntities: { type: "array" }, hasBacklink: { type: "boolean" }, reclamationOpportunity: { type: "boolean" }, context: { type: "string" }, status: { type: "string" } }, [{ key: { organizationId: 1, projectId: 1, url: 1 }, unique: true }]),
  AuthorityScore: tenantModel("authorityScores", { clientId: { type: "objectId" }, projectId: { type: "objectId" }, overallScore: { type: "number" }, averageLinkQuality: { type: "number" }, referringDomainDiversity: { type: "number" }, newLinks30Days: { type: "number" }, lostLinks: { type: "number" }, prActivity: { type: "number" }, outreachActive: { type: "number" }, change: { type: "number" }, timestamp: { type: "date" } }, [{ key: { organizationId: 1, projectId: 1, timestamp: -1 } }]),
  AuthorityReport: tenantModel("authorityReports", { clientId: { type: "objectId" }, projectId: { type: "objectId" }, score: { type: "object" }, newLinks: { type: "array" }, lostLinks: { type: "array" }, authorityChange: { type: "number" }, prActivities: { type: "array" }, outreach: { type: "array" }, nextRecommendations: { type: "array" } }, [{ key: { organizationId: 1, projectId: 1, createdAt: -1 } }]),
  AuthorityRecommendation: tenantModel("authorityRecommendations", { clientId: { type: "objectId" }, projectId: { type: "objectId" }, action: { type: "string" }, status: { type: "string" } }, [{ key: { organizationId: 1, projectId: 1, status: 1 } }]),
  CompetitorBacklinkAnalysis: tenantModel("competitorBacklinkAnalyses", { clientId: { type: "objectId" }, projectId: { type: "objectId" }, observedLinks: { type: "number" }, commonLinkingDomains: { type: "array" }, contentGettingLinks: { type: "array" }, prMentions: { type: "number" }, guestPosts: { type: "number" }, citations: { type: "number" }, recommendations: { type: "array" }, status: { type: "string" } }, [{ key: { organizationId: 1, projectId: 1, createdAt: -1 } }]),
  OutreachSendApproval: tenantModel("outreachSendApprovals", { clientId: { type: "objectId" }, projectId: { type: "objectId" }, purpose: { type: "string" }, status: { type: "string" }, expiresAt: { type: "date" }, consumedAt: { type: "date" } }, [{ key: { expiresAt: 1 }, expireAfterSeconds: 0 }]),
});

export function createTenantDocument(data, context, now = new Date()) {
  if (!context?.organizationId || !context?.userId) throw new Error("Tenant context requires organizationId and userId");
  return { ...data, organizationId: context.organizationId, createdBy: context.userId, createdAt: now, updatedAt: now };
}

export function createTenantFilter(context, filter = {}) {
  if (!context?.organizationId) throw new Error("organizationId is required for tenant queries");
  return { ...filter, organizationId: context.organizationId };
}

export function touchDocument(update, now = new Date()) {
  return { ...update, $set: { ...(update.$set || {}), updatedAt: now } };
}
