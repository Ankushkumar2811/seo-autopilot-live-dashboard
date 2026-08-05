export async function ensureAuthorityIndexes(db) { await Promise.all([
  db.collection("backlinkProjects").createIndex({ organizationId: 1, clientId: 1, updatedAt: -1 }),
  db.collection("backlinkOpportunities").createIndex({ organizationId: 1, projectId: 1, domain: 1, url: 1 }, { unique: true }),
  db.collection("backlinkRecords").createIndex({ organizationId: 1, clientId: 1, sourceURL: 1, targetURL: 1 }, { unique: true }),
  db.collection("outreachCampaigns").createIndex({ organizationId: 1, projectId: 1, status: 1, createdAt: -1 }),
  db.collection("outreachSendApprovals").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  db.collection("outreachSendApprovals").createIndex({ organizationId: 1, projectId: 1, status: 1 }),
  db.collection("digitalPrOpportunities").createIndex({ organizationId: 1, projectId: 1, status: 1 }),
  db.collection("brandMentions").createIndex({ organizationId: 1, projectId: 1, url: 1 }, { unique: true }),
  db.collection("authorityScores").createIndex({ organizationId: 1, projectId: 1, timestamp: -1 }),
  db.collection("authorityReports").createIndex({ organizationId: 1, projectId: 1, createdAt: -1 }),
  db.collection("authorityRecommendations").createIndex({ organizationId: 1, projectId: 1, status: 1 }),
  db.collection("competitorBacklinkAnalyses").createIndex({ organizationId: 1, projectId: 1, createdAt: -1 }),
]); }
