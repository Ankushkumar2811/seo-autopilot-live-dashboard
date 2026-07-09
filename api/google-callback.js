import { GBP_SCOPE, googleRedirectUri } from "./_lib/google-oauth.js";
import { getDb } from "./_lib/db.js";
import { sendJson } from "./_lib/http.js";

export default async function handler(req, res) {
  const code = new URL(req.url, `https://${req.headers.host}`).searchParams.get("code");
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
