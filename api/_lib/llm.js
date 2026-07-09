import { keywordInstruction } from "./seo-links.js";

function fallbackContent({ businessName, city, services, keyword }) {
  const serviceText = services || "local SEO, website optimization, and growth marketing";
  const topic = keyword || serviceText;
  return {
    provider: "fallback",
    blog: {
      title: `${topic}: Practical SEO Plan for ${city || "Local"} Businesses`,
      excerpt: `A practical, locally focused SEO plan for ${businessName || "your business"}.`,
      content: [
        `# ${topic}: Practical SEO Plan`,
        "",
        `${businessName || "Your business"} can improve local visibility by keeping the website technically clean, publishing useful service content, and maintaining an active Google Business Profile.`,
        "",
        "## What to fix first",
        "- Make sure every service page has a clear title, meta description, local keyword focus, and direct call to action.",
        "- Keep business name, address, and phone consistent across the website and citations.",
        "- Add internal links from high-value pages to service pages.",
        "",
        "## Weekly action plan",
        "Publish one helpful blog, one Google Business post, add fresh photos, and request genuine reviews from completed customers.",
      ].join("\n"),
    },
    gmbPosts: [
      {
        topicType: "STANDARD",
        summary: `${businessName || "We"} help ${city || "local"} businesses grow with ${serviceText}. Book a quick SEO audit and see what is stopping calls, clicks, and rankings.`,
        cta: "LEARN_MORE",
      },
      {
        topicType: "STANDARD",
        summary: `This week, focus on reviews, local service pages, and Google Business updates. Small consistent SEO improvements compound into better visibility.`,
        cta: "CALL",
      },
    ],
    imagePrompt: `Clean professional marketing image for ${businessName || "a local business"} about ${topic}, realistic Indian business context, no text overlay, high quality.`,
  };
}

export async function generateSeoContent(input) {
  const providerOrder = (process.env.LLM_PROVIDER_ORDER || "openai,gemini")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  for (const provider of providerOrder) {
    try {
      if (provider === "openai" && process.env.OPENAI_API_KEY) {
        return await generateWithOpenAI(input);
      }
      if (provider === "gemini" && process.env.GEMINI_API_KEY) {
        return await generateWithGemini(input);
      }
    } catch (error) {
      console.error(`${provider} generation failed`, error.message);
    }
  }

  return fallbackContent(input);
}

async function generateWithOpenAI(input) {
  const prompt = buildPrompt(input);
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });
  if (!response.ok) throw new Error(`OpenAI ${response.status}`);
  const data = await response.json();
  return { provider: "openai", ...JSON.parse(data.choices?.[0]?.message?.content || "{}") };
}

async function generateWithGemini(input) {
  const prompt = buildPrompt(input);
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });
  if (!response.ok) throw new Error(`Gemini ${response.status}`);
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "{}";
  return { provider: "gemini", ...JSON.parse(text) };
}

function buildPrompt(input) {
  return `Create SEO content for this business.
Business: ${input.businessName || "Local business"}
City/area: ${input.city || "local market"}
Services: ${input.services || "SEO services"}
Target keyword/topic: ${input.keyword || "local SEO"}
Tone: practical, trustworthy, Indian market friendly.
${keywordInstruction()}

Return only valid JSON:
{
  "blog": {"title": "...", "excerpt": "...", "content": "markdown article, 700-1000 words"},
  "gmbPosts": [{"topicType": "STANDARD", "summary": "80-180 words", "cta": "LEARN_MORE"}],
  "imagePrompt": "prompt for a realistic marketing image with no text overlay"
}`;
}
