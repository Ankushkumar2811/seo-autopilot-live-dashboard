import { readJson, requireMethod, sendJson } from "./_lib/http.js";

export default async function handler(req, res) {
  if (!requireMethod(req, res, ["POST"])) return;
  const { prompt, size = "1024x1024" } = await readJson(req);
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
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size,
      }),
    });
    if (!response.ok) throw new Error(`OpenAI image ${response.status}`);
    const data = await response.json();
    sendJson(res, 200, { ok: true, mode: "generated", image: data.data?.[0] || null });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: "image_generation_failed", message: error.message, prompt });
  }
}
