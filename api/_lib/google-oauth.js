export const GBP_SCOPE = "https://www.googleapis.com/auth/business.manage";

export function normalizeAccountId(value) {
  const clean = String(value || "").trim().replace(/^accounts\//, "");
  return clean ? `accounts/${clean}` : "";
}

export function normalizeLocationId(value) {
  const clean = String(value || "").trim().replace(/^locations\//, "");
  return clean ? `locations/${clean}` : "";
}

export function googleRedirectUri(req) {
  if (process.env.GOOGLE_GBP_REDIRECT_URI) return process.env.GOOGLE_GBP_REDIRECT_URI;
  const host = req.headers.host;
  const protocol = req.headers["x-forwarded-proto"] || "https";
  return `${protocol}://${host}/api/google-callback`;
}

export async function getGoogleAccessToken() {
  if (process.env.GOOGLE_GBP_ACCESS_TOKEN) return process.env.GOOGLE_GBP_ACCESS_TOKEN;
  if (!process.env.GOOGLE_GBP_REFRESH_TOKEN) throw new Error("missing_google_gbp_refresh_token");
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) throw new Error("missing_google_oauth_client");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_GBP_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error_description || data.error || `google_token_${response.status}`);
  return data.access_token;
}
