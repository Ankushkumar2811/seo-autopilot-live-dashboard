import { getDb } from "./_lib/db.js";
import { GBP_SCOPE, getGoogleAccessToken, googleRedirectUri, normalizeAccountId } from "./_lib/google-oauth.js";
import { sendJson } from "./_lib/http.js";
import { withApiHandler } from "../backend/middleware/api-handler.js";
import { Permissions } from "../backend/security/permissions.js";
import { tenantContext } from "../backend/middleware/tenant.js";
import { encryptSecret } from "../backend/security/encryption.js";
import crypto from "node:crypto";
import { ObjectId } from "mongodb";

async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const action = url.searchParams.get("action") || "locations";

  if (action === "oauth-url") return sendOAuthUrl(req, res);
  if (action === "connect") return sendOAuthUrl(req, res, true);
  if (action === "callback") return handleCallback(req, res, url);
  if (action === "locations") return listLocations(req, res);

  return sendJson(res, 404, { ok: false, error: "unknown_gbp_action" });
}

export default withApiHandler(handler, { authRequired: true, permission: Permissions.PUBLISH });

function sendOAuthUrl(req, res, redirect = false) {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return sendJson(res, 428, { ok: false, error: "missing_google_client_id" });
  }

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", googleRedirectUri(req));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GBP_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", signState({ organizationId: req.context.identity.organizationId, userId: req.context.identity.userId, clientId: req.query?.clientId }));

  if (redirect) {
    res.statusCode = 302;
    res.setHeader("Location", url.toString());
    res.end();
    return;
  }
  sendJson(res, 200, { ok: true, url: url.toString(), redirectUri: googleRedirectUri(req) });
}

async function handleCallback(req, res, url) {
  const code = url.searchParams.get("code");
  if (!code) return sendJson(res, 400, { ok: false, error: "missing_code" });
  const state = verifyState(url.searchParams.get("state"));
  if (!state || state.organizationId !== String(req.context.identity.organizationId) || state.userId !== String(req.context.identity.userId)) return sendJson(res, 400, { ok: false, error: "invalid_oauth_state" });
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return sendJson(res, 428, { ok: false, error: "missing_google_oauth_client" });
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: googleRedirectUri(req),
      grant_type: "authorization_code",
    }),
  });
  const token = await response.json().catch(() => ({}));
  if (!response.ok) return sendJson(res, 500, { ok: false, error: "token_exchange_failed", message: token.error_description || token.error });

  const db = await getDb();
  if (db) {
    const tenant = tenantContext(req.context.identity);
    const clientId = ObjectId.isValid(state.clientId) ? new ObjectId(state.clientId) : null;
    const now = new Date();
    await db.collection("googleOAuthTokens").updateOne(
      { organizationId: tenant.organizationId, clientId },
      { $set: { scope: GBP_SCOPE, hasRefreshToken: Boolean(token.refresh_token), encryptedCredentials: encryptSecret({ accessToken: token.access_token, refreshToken: token.refresh_token }), expiresIn: token.expires_in, expiresAt: new Date(Date.now() + Number(token.expires_in || 3600) * 1000), updatedAt: now }, $setOnInsert: { organizationId: tenant.organizationId, clientId, createdBy: tenant.userId, createdAt: now } },
      { upsert: true },
    );
    let discovery;
    try {
      discovery = await discoverGbp(token.access_token);
    } catch (error) {
      const quotaRequired = /quota exceeded|requests per minute/i.test(error.message);
      await db.collection("integrations").updateOne(
        { organizationId: tenant.organizationId, provider: "google_business_profile", clientId },
        { $set: { status: quotaRequired ? "api_approval_required" : "discovery_failed", error: error.message.slice(0, 500), updatedAt: now }, $setOnInsert: { organizationId: tenant.organizationId, clientId, provider: "google_business_profile", createdBy: tenant.userId, createdAt: now } },
        { upsert: true },
      );
      const target = new URL("/", `${url.protocol}//${url.host}`);
      target.searchParams.set("gbp", quotaRequired ? "api_approval_required" : "discovery_failed");
      res.statusCode = 302;
      res.setHeader("Location", target.toString());
      return res.end();
    }
    await db.collection("googleOAuthTokens").updateOne({ organizationId: tenant.organizationId, clientId }, { $set: { accountId: discovery.accountId, locationId: discovery.locationId, updatedAt: now } });
    await db.collection("integrations").updateOne(
      { organizationId: tenant.organizationId, provider: "google_business_profile", clientId },
      { $set: { status: "connected", accountId: discovery.accountId, locationId: discovery.locationId, accountName: discovery.accountName, locationName: discovery.locationName, connectedAt: now, updatedAt: now }, $setOnInsert: { organizationId: tenant.organizationId, clientId, provider: "google_business_profile", createdBy: tenant.userId, createdAt: now } },
      { upsert: true },
    );
    if (clientId) await db.collection("localSeoProjects").updateMany({ organizationId: tenant.organizationId, clientId }, { $set: { accountId: discovery.accountId, locationId: discovery.locationId, updatedAt: now } });
    const target = new URL("/", `${url.protocol}//${url.host}`);
    target.searchParams.set("gbp", "connected");
    target.searchParams.set("accountId", discovery.accountId);
    target.searchParams.set("locationId", discovery.locationId);
    res.statusCode = 302;
    res.setHeader("Location", target.toString());
    return res.end();
  }

  sendJson(res, 200, {
    ok: true,
    message: "Google Business Profile OAuth connected securely.",
    hasRefreshToken: Boolean(token.refresh_token),
  });
}

async function discoverGbp(accessToken) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const accountsResponse = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", { headers });
  const accountsData = await accountsResponse.json().catch(() => ({}));
  if (!accountsResponse.ok) throw new Error(accountsData.error?.message || `GBP accounts ${accountsResponse.status}`);
  const account = accountsData.accounts?.[0];
  const accountId = account?.name?.split("/").pop();
  if (!accountId) throw new Error("No Google Business Profile account was returned for this Google user");
  const locationsResponse = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${encodeURIComponent(accountId)}/locations?readMask=name,title,storefrontAddress,websiteUri,phoneNumbers,metadata`, { headers });
  const locationsData = await locationsResponse.json().catch(() => ({}));
  if (!locationsResponse.ok) throw new Error(locationsData.error?.message || `GBP locations ${locationsResponse.status}`);
  const location = locationsData.locations?.[0];
  const locationId = location?.name?.split("/").pop();
  if (!locationId) throw new Error("No Google Business Profile location was returned for this account");
  return { accountId, locationId, accountName: account.accountName || account.type || account.name, locationName: location.title || location.name };
}

function signState(payload) { const body = Buffer.from(JSON.stringify({ ...payload, organizationId: String(payload.organizationId), userId: String(payload.userId), expiresAt: Date.now() + 10 * 60_000 })).toString("base64url"), signature = crypto.createHmac("sha256", process.env.JWT_SECRET || process.env.INTEGRATION_ENCRYPTION_KEY || "").update(body).digest("base64url"); return `${body}.${signature}`; }
function verifyState(value) { try { const [body, signature] = String(value || "").split("."), expected = crypto.createHmac("sha256", process.env.JWT_SECRET || process.env.INTEGRATION_ENCRYPTION_KEY || "").update(body).digest(), supplied = Buffer.from(signature, "base64url"); if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null; const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")); return payload.expiresAt > Date.now() ? payload : null; } catch { return null; } }

async function listLocations(req, res) {
  const account = normalizeAccountId(process.env.GBP_ACCOUNT_ID);
  if (!account) return sendJson(res, 428, { ok: false, error: "missing_gbp_account_id" });

  try {
    const accessToken = await getGoogleAccessToken();
    const url = `https://mybusinessbusinessinformation.googleapis.com/v1/${account}/locations?readMask=name,title,storefrontAddress,websiteUri,phoneNumbers,metadata`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error?.message || `GBP locations ${response.status}`);
    const locations = (data.locations || []).map((location) => ({
      name: location.name,
      locationId: location.name?.split("/").pop() || "",
      title: location.title,
      address: location.storefrontAddress,
      websiteUri: location.websiteUri,
      phoneNumbers: location.phoneNumbers,
      mapsUri: location.metadata?.mapsUri,
    }));
    sendJson(res, 200, { ok: true, account, locations });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: "gbp_locations_failed", message: error.message });
  }
}
