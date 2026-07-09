import { GBP_SCOPE, googleRedirectUri } from "./_lib/google-oauth.js";
import { requireMethod, sendJson } from "./_lib/http.js";

export default async function handler(req, res) {
  if (!requireMethod(req, res, ["GET"])) return;
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

  sendJson(res, 200, { ok: true, url: url.toString(), redirectUri: googleRedirectUri(req) });
}
