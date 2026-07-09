import { missing, readJson, requireMethod, sendJson } from "./_lib/http.js";

export default async function handler(req, res) {
  if (!requireMethod(req, res, ["POST"])) return;
  const missingKeys = missing(["GOOGLE_GBP_ACCESS_TOKEN", "GBP_ACCOUNT_ID", "GBP_LOCATION_ID"]);
  if (missingKeys.length) {
    return sendJson(res, 428, {
      ok: false,
      error: "missing_gmb_config",
      missing: missingKeys,
      message: "Google OAuth flow must provide an access token before live GMB publishing.",
    });
  }

  const { summary, cta = "LEARN_MORE", url, imageUrl, topicType = "STANDARD" } = await readJson(req);
  if (!summary) return sendJson(res, 400, { ok: false, error: "summary_required" });

  try {
    const body = {
      languageCode: "en-US",
      summary,
      topicType,
      callToAction: url ? { actionType: cta, url } : undefined,
      media: imageUrl ? [{ mediaFormat: "PHOTO", sourceUrl: imageUrl }] : undefined,
    };

    const endpoint = `https://mybusiness.googleapis.com/v4/accounts/${process.env.GBP_ACCOUNT_ID}/locations/${process.env.GBP_LOCATION_ID}/localPosts`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GOOGLE_GBP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error?.message || `GMB ${response.status}`);
    sendJson(res, 200, { ok: true, post: data });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: "gmb_publish_failed", message: error.message });
  }
}
