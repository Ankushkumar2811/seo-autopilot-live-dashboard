import { getDb } from "./_lib/db.js";
import { GBP_SCOPE, getGoogleAccessToken, googleRedirectUri, normalizeAccountId } from "./_lib/google-oauth.js";
import { sendJson } from "./_lib/http.js";

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const action = url.searchParams.get("action") || "locations";

  if (action === "oauth-url") return sendOAuthUrl(req, res);
  if (action === "connect") return sendOAuthUrl(req, res, true);
  if (action === "callback") return handleCallback(req, res, url);
  if (action === "locations") return listLocations(req, res);

  return sendJson(res, 404, { ok: false, error: "unknown_gbp_action" });
}

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
    await db.collection("googleOAuthTokens").insertOne({
      scope: GBP_SCOPE,
      hasRefreshToken: Boolean(token.refresh_token),
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresIn: token.expires_in,
      createdAt: new Date(),
    });
  }

  sendJson(res, 200, {
    ok: true,
    message: "Google Business Profile OAuth connected. Copy GOOGLE_GBP_REFRESH_TOKEN into Vercel env if present.",
    hasRefreshToken: Boolean(token.refresh_token),
    refreshToken: token.refresh_token || null,
  });
}

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
