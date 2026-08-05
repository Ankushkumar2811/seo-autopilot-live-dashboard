import { ObjectId } from "mongodb";
import { withApiHandler } from "../../backend/middleware/api-handler.js";
import { readJson, requireMethod, sendJson } from "../_lib/http.js";
import { ValidationError } from "../../backend/lib/errors.js";
import { requireDb } from "./_shared.js";

async function handler(req, res) {
  const db = await requireDb();
  const userId = new ObjectId(req.context.identity.userId);
  const organizationId = new ObjectId(req.context.identity.organizationId);
  if (req.method === "GET") {
    const sessions = await db.collection("sessions").find({ userId, organizationId, revokedAt: null, expiresAt: { $gt: new Date() } }, { projection: { refreshTokenHash: 0 } }).sort({ createdAt: -1 }).toArray();
    return sendJson(res, 200, { ok: true, sessions: sessions.map((session) => ({ id: session._id.toString(), current: session._id.toString() === req.context.identity.sessionId, userAgent: session.userAgent, createdAt: session.createdAt, updatedAt: session.updatedAt, expiresAt: session.expiresAt })) });
  }
  if (req.method === "DELETE") {
    const { sessionId } = await readJson(req);
    if (!ObjectId.isValid(sessionId)) throw new ValidationError("Invalid session ID");
    await db.collection("sessions").updateOne({ _id: new ObjectId(sessionId), userId, organizationId }, { $set: { revokedAt: new Date(), updatedAt: new Date() } });
    return sendJson(res, 200, { ok: true });
  }
  requireMethod(req, res, ["GET", "DELETE"]);
}
export default withApiHandler(handler, { authRequired: true });
