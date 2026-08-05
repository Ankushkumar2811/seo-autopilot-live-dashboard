import crypto from "node:crypto";
import { AppError } from "../lib/errors.js";

export async function enforceRateLimit(db, req, scope, { limit = 10, windowSeconds = 900 } = {}) {
  const address = String(req.headers?.["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  const key = crypto.createHash("sha256").update(`${scope}:${address}`).digest("hex");
  const now = new Date();
  const windowStart = new Date(Math.floor(now.getTime() / (windowSeconds * 1000)) * windowSeconds * 1000);
  const expiresAt = new Date(windowStart.getTime() + windowSeconds * 2000);
  const result = await db.collection("rateLimits").findOneAndUpdate(
    { key, windowStart }, { $inc: { count: 1 }, $setOnInsert: { scope, createdAt: now, expiresAt } }, { upsert: true, returnDocument: "after" },
  );
  if ((result?.count || 0) > limit) throw new AppError("Too many requests. Please try again later.", { code: "rate_limited", status: 429 });
}
