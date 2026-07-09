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

export async function generateBlogPlan(input) {
  const providerOrder = (process.env.LLM_PROVIDER_ORDER || "openai,gemini")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  for (const provider of providerOrder) {
    try {
      if (provider === "openai" && process.env.OPENAI_API_KEY) {
        return await generatePlanWithOpenAI(input);
      }
      if (provider === "gemini" && process.env.GEMINI_API_KEY) {
        return await generatePlanWithGemini(input);
      }
    } catch (error) {
      console.error(`${provider} blog plan failed`, error.message);
    }
  }

  return fallbackBlogPlan(input);
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

async function generatePlanWithOpenAI(input) {
  const prompt = buildPlanPrompt(input);
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
  return normalizePlan({ provider: "openai", ...JSON.parse(data.choices?.[0]?.message?.content || "{}") }, input);
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

async function generatePlanWithGemini(input) {
  const prompt = buildPlanPrompt(input);
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
  return normalizePlan({ provider: "gemini", ...JSON.parse(text) }, input);
}

function buildPrompt(input) {
  return `Create SEO content for this business.
Business: ${input.businessName || "Local business"}
City/area: ${input.city || "local market"}
Services: ${input.services || "SEO services"}
${input.title ? `Exact blog title to use: ${input.title}` : ""}
Target keyword/topic: ${input.keyword || "local SEO"}
${input.extraKeywords?.length ? `Extra keywords to include naturally: ${input.extraKeywords.join(", ")}` : ""}
Tone: practical, trustworthy, Indian market friendly.
${keywordInstruction()}

Return only valid JSON:
{
  "blog": {"title": "${input.title || "..."}", "excerpt": "...", "content": "markdown article, 900-1300 words with practical headings and clear CTA"},
  "gmbPosts": [{"topicType": "STANDARD", "summary": "80-180 words", "cta": "LEARN_MORE"}],
  "imagePrompt": "prompt for a realistic marketing image with no text overlay"
}`;
}

function buildPlanPrompt(input) {
  return `Create a practical SEO blog publishing plan.
Business: ${input.businessName || "UnnatiX Technologies"}
City/area: ${input.city || "Indore"}
Services/topic: ${input.topic || input.services || "SEO services"}
Website link for internal linking: ${input.linkUrl || process.env.AUTOPILOT_LINK_URL || process.env.WP_SITE_URL || "https://unnatix.in"}
Number of blogs: ${input.count || 5}
Start date: ${input.startDate || "next available date"}
Cadence days: ${input.cadenceDays || 3}

Rules:
- Make titles useful for real buyers, not clickbait.
- Include local SEO intent where relevant.
- Every blog must have one primary keyword and 4-7 secondary keywords.
- Include commercial, informational, and local intent across the whole plan.
- Meta title must be under 60 characters where possible.
- Meta description must be under 155 characters where possible.
- Return dates in YYYY-MM-DD format.
- Avoid duplicate keywords and repeated title patterns.

Return only valid JSON:
{
  "plan": [
    {
      "date": "YYYY-MM-DD",
      "title": "...",
      "primaryKeyword": "...",
      "secondaryKeywords": ["...", "..."],
      "slug": "...",
      "metaTitle": "...",
      "metaDescription": "...",
      "outline": ["H2 heading", "H2 heading", "H2 heading"]
    }
  ]
}`;
}

function fallbackBlogPlan(input) {
  const count = clampCount(input.count);
  const topic = input.topic || input.services || "SEO services";
  const city = input.city || "Indore";
  const templates = [
    {
      title: `Best ${titleCase(topic)} in ${city}: A Practical Guide for Local Businesses`,
      primaryKeyword: `${topic} in ${city}`,
      secondaryKeywords: [`best ${topic} ${city}`, `local ${topic}`, `${city} digital marketing`, `SEO company in ${city}`],
    },
    {
      title: `How ${city} Businesses Can Use ${titleCase(topic)} to Get More Leads`,
      primaryKeyword: `${city} business lead generation`,
      secondaryKeywords: [`${topic} for small business`, `local SEO ${city}`, `website traffic growth`, `Google ranking improvement`],
    },
    {
      title: `${titleCase(topic)} Checklist for Better Google Rankings in ${city}`,
      primaryKeyword: `${topic} checklist`,
      secondaryKeywords: [`Google ranking ${city}`, `on page SEO`, `technical SEO`, `content marketing ${city}`],
    },
    {
      title: `Why Your Website Is Not Ranking and How ${titleCase(topic)} Fixes It`,
      primaryKeyword: `website not ranking`,
      secondaryKeywords: [`SEO audit`, `website SEO issues`, `${topic} agency`, `organic traffic growth`],
    },
    {
      title: `Google Business Profile and ${titleCase(topic)}: What Local Brands Need`,
      primaryKeyword: `Google Business Profile SEO`,
      secondaryKeywords: [`GMB optimization`, `local map ranking`, `${city} local SEO`, `review management`],
    },
    {
      title: `${titleCase(topic)} Cost in ${city}: What Affects Pricing and ROI`,
      primaryKeyword: `${topic} cost ${city}`,
      secondaryKeywords: [`SEO pricing ${city}`, `marketing ROI`, `monthly SEO package`, `lead generation cost`],
    },
    {
      title: `Local SEO vs Paid Ads: What Should ${city} Businesses Choose?`,
      primaryKeyword: `local SEO vs paid ads`,
      secondaryKeywords: [`Google Ads vs SEO`, `${city} marketing strategy`, `organic leads`, `paid traffic`],
    },
    {
      title: `How to Choose the Right ${titleCase(topic)} Partner in ${city}`,
      primaryKeyword: `choose ${topic} partner`,
      secondaryKeywords: [`SEO agency ${city}`, `digital marketing company`, `SEO consultant`, `business growth partner`],
    },
    {
      title: `Service Page SEO: How ${city} Businesses Can Rank for Buyer Keywords`,
      primaryKeyword: `service page SEO`,
      secondaryKeywords: [`buyer intent keywords`, `local service pages`, `${city} SEO strategy`, `conversion optimization`],
    },
    {
      title: `Monthly ${titleCase(topic)} Report: Metrics Every Business Owner Should Track`,
      primaryKeyword: `monthly SEO report`,
      secondaryKeywords: [`SEO metrics`, `keyword rankings`, `organic traffic`, `local SEO performance`],
    },
  ];
  const start = parseDate(input.startDate);
  const cadence = Math.max(1, Number(input.cadenceDays || 3));
  return normalizePlan({
    provider: "fallback",
    plan: Array.from({ length: count }, (_, index) => {
      const base = templates[index % templates.length];
      const date = new Date(start);
      date.setDate(start.getDate() + index * cadence);
      return {
        ...base,
        date: date.toISOString().slice(0, 10),
        slug: slug(base.title),
        metaTitle: base.title.slice(0, 58),
        metaDescription: `Learn how ${base.primaryKeyword} can improve visibility, leads, and local search growth for ${city} businesses.`,
        outline: ["Search intent and buyer problem", "SEO action plan", "Local proof and next steps"],
      };
    }),
  }, input);
}

function normalizePlan(result, input) {
  const start = parseDate(input.startDate);
  const cadence = Math.max(1, Number(input.cadenceDays || 3));
  const plan = Array.isArray(result.plan) ? result.plan : [];
  return {
    provider: result.provider || "unknown",
    plan: plan.slice(0, clampCount(input.count)).map((item, index) => {
      const fallbackDate = new Date(start);
      fallbackDate.setDate(start.getDate() + index * cadence);
      const title = String(item.title || `SEO Blog ${index + 1}`).trim();
      const primaryKeyword = String(item.primaryKeyword || item.keyword || title).trim();
      const secondaryKeywords = Array.isArray(item.secondaryKeywords)
        ? item.secondaryKeywords.map((keyword) => String(keyword).trim()).filter(Boolean)
        : [];
      return {
        date: /^\d{4}-\d{2}-\d{2}$/.test(String(item.date || "")) ? item.date : fallbackDate.toISOString().slice(0, 10),
        title,
        primaryKeyword,
        secondaryKeywords,
        slug: String(item.slug || slug(title)).trim(),
        metaTitle: String(item.metaTitle || title).trim(),
        metaDescription: String(item.metaDescription || "").trim(),
        outline: Array.isArray(item.outline) ? item.outline.map((heading) => String(heading).trim()).filter(Boolean) : [],
      };
    }),
  };
}

function clampCount(value) {
  return Math.min(10, Math.max(1, Number(value || 5)));
}

function parseDate(value) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? new Date(`${value}T00:00:00.000Z`) : new Date();
  if (Number.isNaN(date.getTime())) return new Date();
  return date;
}

function titleCase(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
