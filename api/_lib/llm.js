import { keywordInstruction } from "./seo-links.js";

function fallbackContent({ businessName, city, services, keyword, title }) {
  const serviceText = services || "local SEO, website optimization, and growth marketing";
  const topic = keyword || serviceText;
  const blogTitle = title || `${topic}: Practical SEO Plan for ${city || "Local"} Businesses`;
  return {
    provider: "fallback",
    blog: {
      title: blogTitle,
      excerpt: `A practical, locally focused SEO plan for ${businessName || "your business"}.`,
      content: [
        `# ${blogTitle}`,
        "",
        `${businessName || "Your business"} can improve local visibility by combining technical SEO, useful service content, strong internal linking, and an active Google Business Profile. This guide explains how a real business in ${city || "your city"} can turn ${topic} into calls, enquiries, and better search visibility.`,
        "",
        "## Why this topic matters",
        `People searching for ${topic} are usually comparing options, checking trust, and looking for a clear reason to contact a business. A strong article should answer those questions before the visitor leaves the page.`,
        "",
        "## What to fix first",
        "Start with the service pages that matter most. Each page needs a clear title, helpful headings, proof of work, FAQs, local relevance, and a direct call to action. The website should load fast, work well on mobile, and make it easy for users to call, WhatsApp, or request a quote.",
        "",
        "## Content strategy",
        "Publish blogs that match real customer questions. Cover pricing, process, comparison, mistakes, checklists, and local examples. Every article should connect naturally to a service page using internal links, so readers and search engines understand which pages are most important.",
        "",
        "## Local SEO signals",
        "Keep the business name, address, phone number, service areas, photos, reviews, and Google Business updates consistent. Local rankings improve when the website and profile tell the same story repeatedly and clearly.",
        "",
        "## Conversion plan",
        "Good SEO is not only ranking. Add proof, benefits, process, FAQs, and a strong CTA near the end of the blog. Visitors should know what problem you solve, why you are credible, and what step to take next.",
        "",
        "## Weekly action plan",
        "Publish one useful blog, one Google Business post, add fresh photos, request genuine reviews, and track calls, form submissions, rankings, and organic traffic. Small consistent work compounds into stronger visibility.",
        "",
        "## FAQ",
        `### How long does ${topic} take to show results?`,
        "Most businesses need consistent work for a few months, depending on competition, website quality, content depth, and review strength.",
        "",
        "### Should every blog target a keyword?",
        "Yes, but the article should still read naturally. The goal is to answer the user intent better than competing pages.",
        "",
        "### What should be the next step?",
        `Book a practical audit with ${businessName || "the team"} and identify the pages, keywords, and Google Business improvements that can create the quickest gains.`,
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
    imagePrompt: `Realistic high-quality featured image for the blog titled "${blogTitle}", Indian business owner and digital marketing team reviewing website analytics, modern office, natural light, no text overlay.`,
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
        return fillPlan(await generatePlanWithOpenAI(input), input);
      }
      if (provider === "gemini" && process.env.GEMINI_API_KEY) {
        return fillPlan(await generatePlanWithGemini(input), input);
      }
    } catch (error) {
      console.error(`${provider} blog plan failed`, error.message);
    }
  }

  return fallbackBlogPlan(input);
}

function fillPlan(result, input) {
  const count = clampCount(input.count);
  if ((result.plan || []).length >= count) return result;
  const supplement = fallbackBlogPlan({
    ...input,
    count: count - (result.plan || []).length,
    excludeTitles: [...(input.excludeTitles || []), ...(result.plan || []).map((item) => item.title)],
  });
  return {
    provider: result.provider,
    plan: [...(result.plan || []), ...supplement.plan].slice(0, count),
  };
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
  "blog": {"title": "${input.title || "..."}", "excerpt": "...", "content": "markdown article, 1600-2200 words, deep practical SEO guide with H2/H3 headings, local examples, bullets, FAQ, conclusion and clear CTA"},
  "gmbPosts": [{"topicType": "STANDARD", "summary": "80-180 words", "cta": "LEARN_MORE"}],
  "imagePrompt": "realistic featured image prompt based on the exact blog title, no text overlay"
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
${input.excludeTitles?.length ? `- Do not use these already generated or scheduled titles: ${input.excludeTitles.slice(0, 120).join(" | ")}` : ""}

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
      "imagePrompt": "realistic featured image prompt, no text overlay",
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
    plan: Array.from({ length: count + normalizeTitleList(input.excludeTitles).length + 20 }, (_, index) => {
      const base = templates[index % templates.length];
      const date = new Date(start);
      date.setDate(start.getDate() + index * cadence);
      const cycle = Math.floor(index / templates.length);
      const title = cycle ? addTitleVariant(base.title, cycle) : base.title;
      return {
        ...base,
        title,
        date: date.toISOString().slice(0, 10),
        slug: slug(title),
        metaTitle: title.slice(0, 58),
        metaDescription: `Learn how ${base.primaryKeyword} can improve visibility, leads, and local search growth for ${city} businesses.`,
        imagePrompt: `Realistic professional featured image for a blog about ${title}, Indian business owner reviewing website analytics with a digital marketing team, modern office, warm natural light, no text overlay, high quality.`,
        outline: ["Search intent and buyer problem", "SEO action plan", "Local proof and next steps"],
      };
    }),
  }, input);
}

function normalizePlan(result, input) {
  const start = parseDate(input.startDate);
  const cadence = Math.max(1, Number(input.cadenceDays || 3));
  const excluded = new Set(normalizeTitleList(input.excludeTitles));
  const seen = new Set();
  const plan = Array.isArray(result.plan) ? result.plan : [];
  return {
    provider: result.provider || "unknown",
    plan: plan.map((item, index) => {
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
        imagePrompt: String(item.imagePrompt || `Realistic professional SEO blog featured image for ${title}, no text overlay`).trim(),
        outline: Array.isArray(item.outline) ? item.outline.map((heading) => String(heading).trim()).filter(Boolean) : [],
      };
    }).filter((item) => {
      const key = normalizeTitle(item.title);
      if (!key || excluded.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, clampCount(input.count)),
  };
}

function clampCount(value) {
  return Math.min(50, Math.max(1, Number(value || 5)));
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

function normalizeTitleList(values = []) {
  return values.map(normalizeTitle).filter(Boolean);
}

function normalizeTitle(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function addTitleVariant(title, cycle) {
  const variants = [
    "Advanced Guide",
    "Mistakes to Avoid",
    "Step by Step Plan",
    "Buyer Checklist",
    "Growth Playbook",
  ];
  return `${title}: ${variants[(cycle - 1) % variants.length]}`;
}
