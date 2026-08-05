import { ObjectId } from "mongodb";

export async function logActivity(db, identity, action, metadata = {}) {
  if (!db || !identity?.organizationId) return;
  const organizationId = ObjectId.isValid(identity.organizationId) ? new ObjectId(identity.organizationId) : identity.organizationId;
  const userId = ObjectId.isValid(identity.userId) ? new ObjectId(identity.userId) : identity.userId || null;
  await db.collection("activityLogs").insertOne({
    userId, organizationId, action,
    metadata, timestamp: new Date(), createdBy: userId, createdAt: new Date(), updatedAt: new Date(),
  });
}
