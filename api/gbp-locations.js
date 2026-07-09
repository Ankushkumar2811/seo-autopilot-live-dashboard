import { getGoogleAccessToken, normalizeAccountId } from "./_lib/google-oauth.js";
import { requireMethod, sendJson } from "./_lib/http.js";

export default async function handler(req, res) {
  if (!requireMethod(req, res, ["GET"])) return;
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
