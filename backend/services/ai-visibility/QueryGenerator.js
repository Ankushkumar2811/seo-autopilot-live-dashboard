const TYPES = ["Commercial", "Informational", "Local", "Comparison"];
export class QueryGenerator {
  generate(input, limit = 200) { const brand = input.brandName || "the business", industry = input.industry || "service provider", services = array(input.services, [industry]), locations = array(input.locations, ["my area"]), customers = array(input.targetCustomers, ["businesses"]), competitors = array(input.competitors); const queries = [];
    for (const service of services) for (const location of locations) for (const customer of customers) queries.push(
      item(`best ${service} company in ${location} for ${customer}`, "Commercial", location, "high"), item(`how to choose a ${service} provider in ${location}`, "Informational", location, "medium"), item(`${service} near me in ${location}`, "Local", location, "high"), item(`top ${service} agencies in ${location}`, "Comparison", location, "high"), item(`is ${brand} good for ${service}`, "Comparison", location, "high"), item(`recommended ${industry} companies for ${customer}`, "Commercial", location, "high"));
    for (const competitor of competitors) for (const service of services) queries.push(item(`${brand} vs ${competitor} for ${service}`, "Comparison", locations[0], "high"));
    return [...new Map(queries.map((query) => [query.query.toLowerCase(), query])).values()].slice(0, Math.max(1, Math.min(500, Number(limit || 200)))); }
}
function array(value, fallback = []) { const values = Array.isArray(value) ? value : String(value || "").split(","); const cleaned = values.map((item) => String(item).trim()).filter(Boolean); return cleaned.length ? cleaned : fallback; }
function item(query, category, location, intent) { return { query, category, location, intent, type: TYPES.includes(category) ? category : "Informational" }; }
