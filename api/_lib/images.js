import crypto from "node:crypto";

export async function generateImageAsset(prompt, title = "seo-blog-image") {
  if (!prompt) return { mode: "none", imageUrl: "" };
  if (process.env.GEMINI_API_KEY) {
    try {
      return await generateGeminiImage(prompt, title);
    } catch (error) {
      console.error("Gemini image generation failed", error.message);
    }
  }
  if (!process.env.OPENAI_API_KEY) {
    return generateBrandedImage(prompt, title);
  }

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

  const imageUrl = await uploadDataUriToCloudinary(`data:image/png;base64,${b64}`, title);
  return { mode: "generated", imageUrl, prompt };
}

export function hasImageGeneration() {
  return Boolean(process.env.OPENAI_API_KEY && hasCloudinary());
}

function hasCloudinary() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

async function generateGeminiImage(prompt, title) {
  const model = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image";
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      model,
      input: [{ type: "text", text: strengthenImagePrompt(prompt, title) }],
      response_format: {
        type: "image",
        mime_type: "image/png",
        aspect_ratio: "16:9",
        image_size: "1K",
      },
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `Gemini image ${response.status}`);
  const image = findGeminiImage(data);
  if (!image?.data) throw new Error("Gemini returned no image");
  const mimeType = image.mime_type || image.mimeType || "image/png";
  if (!hasCloudinary()) return { mode: "gemini_generated_no_cloudinary", imageUrl: "", image, prompt };
  const imageUrl = await uploadDataUriToCloudinary(`data:${mimeType};base64,${image.data}`, title);
  return { mode: "gemini_generated", imageUrl, prompt };
}

function findGeminiImage(data) {
  if (data.output_image?.data) return data.output_image;
  if (data.outputImage?.data) return data.outputImage;
  const blocks = [
    ...(Array.isArray(data.output) ? data.output : []),
    ...(Array.isArray(data.steps) ? data.steps.flatMap((step) => step.output || step.outputs || []) : []),
  ];
  return blocks.find((block) => block?.type === "image" && block?.data) || null;
}

function strengthenImagePrompt(prompt, title) {
  return [
    `Create a realistic, high-quality 16:9 blog featured image for: ${title}.`,
    prompt,
    "Indian business context, modern professional setting, SEO and digital growth theme, natural lighting.",
    "No text, no logo, no watermark, no UI screenshot, no distorted hands, no blurry faces.",
  ].filter(Boolean).join(" ");
}

async function generateBrandedImage(prompt, title) {
  if (!hasCloudinary()) return { mode: "prompt_only", imageUrl: "", prompt };
  const svg = buildBrandedSvg(title, prompt);
  const b64 = Buffer.from(svg, "utf8").toString("base64");
  const imageUrl = await uploadDataUriToCloudinary(`data:image/svg+xml;base64,${b64}`, title);
  return { mode: "generated_brand_card", imageUrl: toPngDeliveryUrl(imageUrl), prompt };
}

async function uploadDataUriToCloudinary(dataUri, title) {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = process.env.CLOUDINARY_FOLDER || "seo-autopilot/blog-images";
  const publicId = `${slug(title)}-${Date.now()}`;
  const params = {
    folder,
    public_id: publicId,
    timestamp,
  };
  const signature = signCloudinary(params);
  const form = new FormData();
  form.set("file", dataUri);
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

function buildBrandedSvg(title, prompt) {
  const safeTitle = escapeXml(title).slice(0, 140);
  const subtitle = escapeXml(buildSubtitle(title, prompt)).slice(0, 130);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#12343b"/>
      <stop offset="0.55" stop-color="#0f766e"/>
      <stop offset="1" stop-color="#d99a21"/>
    </linearGradient>
    <pattern id="grid" width="54" height="54" patternUnits="userSpaceOnUse">
      <path d="M 54 0 L 0 0 0 54" fill="none" stroke="rgba(255,255,255,.13)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <circle cx="1010" cy="110" r="92" fill="rgba(255,255,255,.16)"/>
  <circle cx="1038" cy="122" r="42" fill="rgba(255,255,255,.22)"/>
  <rect x="82" y="78" width="1036" height="474" rx="34" fill="rgba(255,255,255,.94)"/>
  <rect x="122" y="116" width="118" height="48" rx="12" fill="#12343b"/>
  <text x="146" y="148" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="800" fill="#ffffff">UnnatiX</text>
  <text x="122" y="248" font-family="Georgia, serif" font-size="50" font-weight="800" fill="#17212b">${wrapSvgText(safeTitle, 33, 122, 248, 62)}</text>
  <text x="122" y="456" font-family="Inter, Arial, sans-serif" font-size="25" font-weight="700" fill="#0f766e">${wrapSvgText(subtitle, 62, 122, 456, 34, 2)}</text>
  <text x="122" y="522" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="700" fill="#667085">SEO | Website | Social Media | Growth Marketing</text>
  <path d="M895 385c66-90 126-138 178-144-24 47-44 112-50 194-39-38-82-53-128-50Z" fill="#d99a21" opacity=".9"/>
</svg>`;
}

function wrapSvgText(text, maxChars, x, y, lineHeight, maxLines = 3) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines.map((item, index) => `<tspan x="${x}" y="${y + index * lineHeight}">${item}</tspan>`).join("");
}

function buildSubtitle(title, prompt) {
  const city = extractCity(title) || extractCity(prompt);
  const service = extractService(title);
  if (city && service) return `A practical ${service} guide for growth-focused businesses in ${city}`;
  if (service) return `A practical ${service} guide for growth-focused businesses`;
  if (city) return `Practical digital growth insights for businesses in ${city}`;
  return "Practical digital growth insights for Indian businesses";
}

function extractCity(value = "") {
  const text = String(value || "");
  const match = text.match(/\bin\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})/);
  return match?.[1]?.replace(/\bFor\b.*$/i, "").trim();
}

function extractService(value = "") {
  const text = String(value || "").toLowerCase();
  const services = [
    "social media management",
    "app development",
    "website development",
    "digital marketing",
    "seo",
    "google business profile",
    "content marketing",
  ];
  return services.find((service) => text.includes(service)) || "digital marketing";
}

function toPngDeliveryUrl(url) {
  return url.replace("/upload/", "/upload/f_png,q_auto,w_1200/").replace(/\.svg($|\?)/, ".png$1");
}

function escapeXml(value) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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
