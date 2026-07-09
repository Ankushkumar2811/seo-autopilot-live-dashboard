import crypto from "node:crypto";

export async function generateImageAsset(prompt, title = "seo-blog-image") {
  if (!prompt) return { mode: "none", imageUrl: "" };
  if (!process.env.OPENAI_API_KEY) return { mode: "prompt_only", imageUrl: "", prompt };

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
      prompt,
      size: process.env.OPENAI_IMAGE_SIZE || "1024x1024",
    }),
  });
  if (!response.ok) throw new Error(`OpenAI image ${response.status}`);
  const data = await response.json();
  const image = data.data?.[0] || {};
  const b64 = image.b64_json;
  if (!b64) return { mode: "generated_no_upload", imageUrl: image.url || "", image, prompt };

  if (!hasCloudinary()) {
    return { mode: "generated_no_cloudinary", imageUrl: "", image, prompt };
  }

  const imageUrl = await uploadBase64ToCloudinary(b64, title);
  return { mode: "generated", imageUrl, prompt };
}

export function hasImageGeneration() {
  return Boolean(process.env.OPENAI_API_KEY && hasCloudinary());
}

function hasCloudinary() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

async function uploadBase64ToCloudinary(b64, title) {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = process.env.CLOUDINARY_FOLDER || "seo-autopilot/blog-images";
  const publicId = slug(title);
  const params = {
    folder,
    public_id: publicId,
    timestamp,
  };
  const signature = signCloudinary(params);
  const form = new FormData();
  form.set("file", `data:image/png;base64,${b64}`);
  form.set("api_key", process.env.CLOUDINARY_API_KEY);
  form.set("timestamp", String(timestamp));
  form.set("folder", folder);
  form.set("public_id", publicId);
  form.set("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: form,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `Cloudinary ${response.status}`);
  return data.secure_url;
}

function signCloudinary(params) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return crypto.createHash("sha1").update(`${payload}${process.env.CLOUDINARY_API_SECRET}`).digest("hex");
}

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "seo-blog-image";
}
