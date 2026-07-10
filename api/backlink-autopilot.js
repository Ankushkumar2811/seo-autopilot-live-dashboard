import { getDb } from "./_lib/db.js";
import { readJson, requireMethod, sendJson } from "./_lib/http.js";

const BASE_PROSPECTS = [
  { site: "Google Business Profile website link", url: "https://business.google.com", authority: 95, type: "local-profile", action: "Keep website, services, photos, posts, and review link updated." },
  { site: "Bing Places", url: "https://www.bingplaces.com", authority: 90, type: "local-citation", action: "Create or claim the business listing with matching NAP details." },
  { site: "Apple Business Connect", url: "https://businessconnect.apple.com", authority: 92, type: "local-citation", action: "Add business profile for Apple Maps visibility." },
  { site: "Justdial", url: "https://www.justdial.com/Free-Listing", authority: 78, type: "india-directory", action: "Submit business details, service categories, photos, and website URL." },
  { site: "Sulekha", url: "https://www.sulekha.com/business-listing", authority: 74, type: "india-directory", action: "Create a service provider profile with city and service keywords." },
  { site: "IndiaMART", url: "https://seller.indiamart.com", authority: 82, type: "business-profile", action: "Create company profile if services/products fit the platform." },
  { site: "Crunchbase", url: "https://www.crunchbase.com/add-new", authority: 91, type: "brand-entity", action: "Create or update company profile with website and business details." },
  { site: "LinkedIn Company Page", url: "https://www.linkedin.com/company/setup/new/", authority: 98, type: "brand-entity", action: "Complete company page and link website/service pages." },
  { site: "Facebook Page", url: "https://www.facebook.com/pages/creation/", authority: 96, type: "social-profile", action: "Complete page details and add website link." },
  { site: "Instagram Business Profile", url: "https://business.instagram.com", authority: 94, type: "social-profile", action: "Add website link and keep profile activity fresh." },
  { site: "YouTube Channel About", url: "https://www.youtube.com", authority: 100, type: "social-profile", action: "Add website and service links in channel profile." },
  { site: "Medium", url: "https://medium.com", authority: 94, type: "content-profile", action: "Create brand profile and publish helpful summaries linking to primary guides." },
  { site: "Quora Profile", url: "https://www.quora.com", authority: 92, type: "expert-profile", action: "Build expert profile and answer relevant questions without spam." },
  { site: "Local Chamber / Association", url: "", authority: 55, type: "local-editorial", action: "Find city business associations and request a member listing." },
  { site: "Partner/Vendor Mentions", url: "", authority: 50, type: "relationship-link", action: "Ask vendors, clients, and partners for genuine resource or testimonial mentions." },
];

export default async function handler(req, res) {
  if (!requireMethod(req, res, ["POST"])) return;
  const body = await readJson(req);
  const input = normalizeInput(body);

  const prospects = buildProspects(input);
  const run = {
    ok: true,
    generatedAt: new Date().toISOString(),
    business: input.businessName,
    city: input.city,
    websiteUrl: input.websiteUrl,
    prospects,
    nextActions: [
      "Start with high-trust profiles and India/local citations first.",
      "Use exactly matching NAP details across all submissions.",
      "Mark each prospect as submitted, then verify the live URL after approval.",
      "Avoid paid spam packages and unrelated comment/profile links.",
    ],
  };

  const db = await getDb();
  if (db) {
    await db.collection("backlinkAutopilotRuns").insertOne({ input, run, createdAt: new Date() });
  }

  sendJson(res, 200, run);
}

function normalizeInput(body) {
  return {
    businessName: clean(body.businessName || "UnnatiX Technologies"),
    city: clean(body.city || "Indore"),
    websiteUrl: clean(body.websiteUrl || process.env.AUTOPILOT_LINK_URL || process.env.WP_SITE_URL || "https://unnatix.in"),
    services: clean(body.services || "SEO, website development, digital marketing"),
    phone: clean(body.phone || ""),
    email: clean(body.email || ""),
    address: clean(body.address || ""),
    keywords: Array.isArray(body.keywords) ? body.keywords.map(clean).filter(Boolean) : splitKeywords(body.keywords),
    existingSites: Array.isArray(body.existingSites) ? body.existingSites.map((site) => clean(site).toLowerCase()).filter(Boolean) : [],
  };
}

function buildProspects(input) {
  const keywords = input.keywords.length ? input.keywords : defaultKeywords(input);
  return BASE_PROSPECTS
    .filter((prospect) => !input.existingSites.some((site) => prospect.site.toLowerCase().includes(site)))
    .map((prospect, index) => ({
      id: `bp-${slug(prospect.site)}-${index}`,
      site: prospect.site,
      url: prospect.url,
      authority: prospect.authority,
      type: prospect.type,
      priority: prospect.authority >= 90 ? "high" : prospect.authority >= 70 ? "medium" : "manual",
      status: "identified",
      date: new Date().toISOString().slice(0, 10),
      action: prospect.action,
      anchorIdeas: buildAnchors(input, keywords),
      submissionData: {
        businessName: input.businessName,
        websiteUrl: input.websiteUrl,
        city: input.city,
        services: input.services,
        phone: input.phone,
        email: input.email,
        address: input.address,
      },
      outreach: buildOutreach(input, prospect),
    }));
}

function buildAnchors(input, keywords) {
  return [
    input.businessName,
    `${input.businessName} ${input.city}`,
    ...keywords.slice(0, 3),
  ].filter(Boolean);
}

function buildOutreach(input, prospect) {
  const subject = `Listing request for ${input.businessName}`;
  const body = [
    `Hi ${prospect.site} team,`,
    "",
    `Please help us add or update the business listing for ${input.businessName}.`,
    `Website: ${input.websiteUrl}`,
    `City: ${input.city}`,
    `Services: ${input.services}`,
    input.phone ? `Phone: ${input.phone}` : "",
    input.email ? `Email: ${input.email}` : "",
    input.address ? `Address: ${input.address}` : "",
    "",
    "Please let us know if any verification or additional details are required.",
    "",
    "Thanks,",
    input.businessName,
  ].filter(Boolean).join("\n");
  return { subject, body };
}

function defaultKeywords(input) {
  return [
    `${input.services.split(",")[0]?.trim() || "SEO"} in ${input.city}`,
    `digital marketing company ${input.city}`,
    `website development ${input.city}`,
  ];
}

function splitKeywords(value) {
  return String(value || "").split(",").map(clean).filter(Boolean);
}

function clean(value) {
  return String(value || "").trim();
}

function slug(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
}
