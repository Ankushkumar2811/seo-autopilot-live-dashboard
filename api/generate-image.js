import { readJson, requireMethod, sendJson } from "./_lib/http.js";
import { generateImageAsset } from "./_lib/images.js";

export default async function handler(req, res) {
  if (!requireMethod(req, res, ["POST"])) return;
  const { prompt, title } = await readJson(req);
  if (!prompt) return sendJson(res, 400, { ok: false, error: "prompt_required" });

  if (!process.env.OPENAI_API_KEY) {
    return sendJson(res, 200, {
      ok: true,
      mode: "brief_only",
      imageUrl: null,
      prompt,
      message: "Add OPENAI_API_KEY to generate real images. This prompt is ready for image generation.",
    });
  }

  try {
    const result = await generateImageAsset(prompt, title);
    sendJson(res, 200, { ok: true, ...result });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: "image_generation_failed", message: error.message, prompt });
  }
}
