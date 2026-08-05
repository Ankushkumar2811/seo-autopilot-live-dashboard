import crypto from "node:crypto";
import { ObjectId } from "mongodb";
import { getConfig } from "../config/env.js";
import { AppError, AuthenticationError, ValidationError } from "../lib/errors.js";
import { hashPassword, validatePasswordStrength, verifyPassword } from "../security/password.js";
import { hashToken, randomToken, signAccessToken } from "../security/tokens.js";
import { Roles } from "../security/permissions.js";
import { sendTransactionalEmail } from "./email-service.js";
import { logActivity } from "./activity-service.js";

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const slugify = (value) => String(value || "organization").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "organization";
const publicUser = (user) => ({ id: user._id.toString(), name: user.name, email: user.email, role: user.role, status: user.status, emailVerified: user.emailVerified, organizationId: user.organizationId.toString(), lastLogin: user.lastLogin || null });

export async function registerUser(db, input) {
  const name = String(input.name || "").trim();
  const email = normalizeEmail(input.email);
  const organizationName = String(input.organizationName || "").trim();
  if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || organizationName.length < 2) throw new ValidationError("Name, valid email, and organization name are required");
  const passwordIssue = validatePasswordStrength(input.password);
  if (passwordIssue) throw new ValidationError(passwordIssue);
  if (await db.collection("users").findOne({ email })) throw new AppError("An account with this email already exists", { code: "email_exists", status: 409 });

  const now = new Date();
  const userId = new ObjectId();
  const organizationId = new ObjectId();
  let slug = slugify(organizationName);
  if (await db.collection("organizations").findOne({ slug })) slug = `${slug}-${crypto.randomBytes(3).toString("hex")}`;
  const passwordHash = await hashPassword(input.password);
  await db.collection("organizations").insertOne({ _id: organizationId, name: organizationName, slug, ownerId: userId, plan: "starter", settings: {}, createdAt: now, updatedAt: now });
  try {
    await db.collection("users").insertOne({ _id: userId, name, email, passwordHash, role: Roles.AGENCY_OWNER, status: "active", emailVerified: false, organizationId, lastLogin: null, createdAt: now, updatedAt: now });
  } catch (error) {
    await db.collection("organizations").deleteOne({ _id: organizationId, ownerId: userId });
    if (error?.code === 11000) throw new AppError("An account with this email already exists", { code: "email_exists", status: 409 });
    throw error;
  }
  const user = await db.collection("users").findOne({ _id: userId });
  await issueEmailToken(db, user, "verify_email");
  await logActivity(db, { userId, organizationId }, "user_registered", {});
  return createSession(db, user);
}

export async function loginUser(db, emailValue, password, context = {}) {
  const email = normalizeEmail(emailValue);
  const user = await db.collection("users").findOne({ email });
  if (!user || !(await verifyPassword(password, user.passwordHash))) throw new AuthenticationError("Invalid email or password");
  if (user.status !== "active") throw new AuthenticationError("Account is not active");
  const now = new Date();
  await db.collection("users").updateOne({ _id: user._id }, { $set: { lastLogin: now, updatedAt: now } });
  user.lastLogin = now;
  const session = await createSession(db, user, context);
  await logActivity(db, { userId: user._id, organizationId: user.organizationId }, "login", { sessionId: session.sessionId });
  return session;
}

async function createSession(db, user, context = {}) {
  const config = getConfig();
  const refreshToken = randomToken(48);
  const sessionId = new ObjectId();
  const expiresAt = new Date(Date.now() + config.auth.refreshTokenSeconds * 1000);
  await db.collection("sessions").insertOne({ _id: sessionId, userId: user._id, organizationId: user.organizationId, createdBy: user._id, refreshTokenHash: hashToken(refreshToken), userAgent: String(context.userAgent || "").slice(0, 500), expiresAt, revokedAt: null, createdAt: new Date(), updatedAt: new Date() });
  const accessToken = signAccessToken({ sub: user._id.toString(), org: user.organizationId.toString(), role: user.role, sid: sessionId.toString() });
  return { accessToken, refreshToken: `${sessionId}.${refreshToken}`, sessionId: sessionId.toString(), user: publicUser(user), expiresIn: config.auth.accessTokenSeconds };
}

export async function rotateSession(db, combinedToken) {
  const [sessionIdValue, token] = String(combinedToken || "").split(".");
  if (!ObjectId.isValid(sessionIdValue) || !token) throw new AuthenticationError("Invalid refresh token");
  const sessionId = new ObjectId(sessionIdValue);
  const session = await db.collection("sessions").findOne({ _id: sessionId, refreshTokenHash: hashToken(token), revokedAt: null, expiresAt: { $gt: new Date() } });
  if (!session) throw new AuthenticationError("Refresh session expired or revoked");
  const user = await db.collection("users").findOne({ _id: session.userId, organizationId: session.organizationId, status: "active" });
  if (!user) throw new AuthenticationError();
  const nextToken = randomToken(48);
  await db.collection("sessions").updateOne({ _id: sessionId, refreshTokenHash: hashToken(token), revokedAt: null }, { $set: { refreshTokenHash: hashToken(nextToken), updatedAt: new Date() } });
  return { accessToken: signAccessToken({ sub: user._id.toString(), org: user.organizationId.toString(), role: user.role, sid: sessionId.toString() }), refreshToken: `${sessionId}.${nextToken}`, sessionId: sessionId.toString(), user: publicUser(user), expiresIn: getConfig().auth.accessTokenSeconds };
}

export async function revokeSession(db, combinedToken, identity) {
  const [sessionIdValue] = String(combinedToken || "").split(".");
  if (ObjectId.isValid(sessionIdValue)) await db.collection("sessions").updateOne({ _id: new ObjectId(sessionIdValue), ...(identity?.userId ? { userId: new ObjectId(identity.userId) } : {}) }, { $set: { revokedAt: new Date(), updatedAt: new Date() } });
  if (identity?.organizationId) await logActivity(db, identity, "logout", {});
}

async function issueEmailToken(db, user, type) {
  const raw = randomToken(32);
  const config = getConfig();
  const ttl = type === "verify_email" ? config.auth.verificationTokenSeconds : config.auth.resetTokenSeconds;
  await db.collection("authTokens").deleteMany({ userId: user._id, type, usedAt: null });
  await db.collection("authTokens").insertOne({ userId: user._id, organizationId: user.organizationId, createdBy: user._id, type, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + ttl * 1000), usedAt: null, createdAt: new Date(), updatedAt: new Date() });
  const route = type === "verify_email" ? "verify-email" : "reset-password";
  const url = `${config.app.url.replace(/\/$/, "")}/?auth=${route}&token=${encodeURIComponent(raw)}`;
  await sendTransactionalEmail({ to: user.email, subject: type === "verify_email" ? "Verify your UnnatiX account" : "Reset your UnnatiX password", text: `Open this secure link: ${url}`, html: `<p>Open this secure link:</p><p><a href="${url}">${url}</a></p>` });
}

export async function requestPasswordReset(db, emailValue) {
  const user = await db.collection("users").findOne({ email: normalizeEmail(emailValue), status: "active" });
  if (user) await issueEmailToken(db, user, "reset_password");
}

export async function resetPassword(db, token, password) {
  const issue = validatePasswordStrength(password); if (issue) throw new ValidationError(issue);
  const record = await db.collection("authTokens").findOneAndUpdate({ type: "reset_password", tokenHash: hashToken(token), usedAt: null, expiresAt: { $gt: new Date() } }, { $set: { usedAt: new Date() } }, { returnDocument: "before" });
  if (!record) throw new ValidationError("Reset token is invalid or expired");
  await db.collection("users").updateOne({ _id: record.userId }, { $set: { passwordHash: await hashPassword(password), updatedAt: new Date() } });
  await db.collection("sessions").updateMany({ userId: record.userId, revokedAt: null }, { $set: { revokedAt: new Date(), updatedAt: new Date() } });
}

export async function verifyEmail(db, token) {
  const record = await db.collection("authTokens").findOneAndUpdate({ type: "verify_email", tokenHash: hashToken(token), usedAt: null, expiresAt: { $gt: new Date() } }, { $set: { usedAt: new Date() } }, { returnDocument: "before" });
  if (!record) throw new ValidationError("Verification token is invalid or expired");
  await db.collection("users").updateOne({ _id: record.userId, organizationId: record.organizationId }, { $set: { emailVerified: true, updatedAt: new Date() } });
}

export async function getCurrentUser(db, identity) {
  const user = await db.collection("users").findOne({ _id: new ObjectId(identity.userId), organizationId: new ObjectId(identity.organizationId), status: "active" });
  if (!user) throw new AuthenticationError();
  return publicUser(user);
}
