export async function ensureAIVisibilityIndexes(db) { await Promise.all([
  db.collection("aiVisibilityProjects").createIndex({ organizationId: 1, clientId: 1, updatedAt: -1 }),
  db.collection("aiQueryTracking").createIndex({ organizationId: 1, projectId: 1, query: 1 }, { unique: true }),
  db.collection("aiResponseRecords").createIndex({ organizationId: 1, projectId: 1, queryId: 1, provider: 1, timestamp: -1 }),
  db.collection("aiVisibilityScores").createIndex({ organizationId: 1, projectId: 1, timestamp: -1 }),
  db.collection("entityProfiles").createIndex({ organizationId: 1, clientId: 1 }, { unique: true }),
  db.collection("geoRecommendations").createIndex({ organizationId: 1, projectId: 1, status: 1, priority: 1 }),
  db.collection("aiUsageLogs").createIndex({ organizationId: 1, timestamp: -1 }),
  db.collection("aiUsageLogs").createIndex({ timestamp: 1 }, { expireAfterSeconds: 31536000 }),
]); }
