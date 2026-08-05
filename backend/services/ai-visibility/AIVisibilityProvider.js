export class AIVisibilityProvider {
  constructor({ id, model, apiKey }) { this.id = id; this.model = model; this.apiKey = apiKey; }
  isConfigured() { return Boolean(this.apiKey); }
  async sendQuery() { throw new Error(`${this.id}.sendQuery is not implemented`); }
  captureResponse(payload) { return payload; }
  extractBrands(text, candidates = []) {
    const normalized = String(text || "").toLowerCase();
    const found = candidates.filter(Boolean).map((name) => String(name).trim()).filter((name, index, all) => all.findIndex((item) => item.toLowerCase() === name.toLowerCase()) === index).filter((name) => normalized.includes(name.toLowerCase()));
    return found.map((brand) => { const offset = normalized.indexOf(brand.toLowerCase()); const before = normalized.slice(0, offset); const position = Math.max(1, (before.match(/^|\n\s*(?:\d+[.)]|[-*])/g) || []).length); const context = String(text).slice(Math.max(0, offset - 120), offset + brand.length + 180).trim(); return { brand, position, context, recommendationStrength: /recommend|best|top|leading|choose/i.test(context) ? "strong" : "mentioned", sentiment: /avoid|poor|weak|not recommend/i.test(context) ? "negative" : "positive" }; });
  }
  extractSources(text) { return [...new Set([...String(text || "").matchAll(/https?:\/\/[^\s)\]}>"']+/gi)].map((match) => match[0].replace(/[.,;:]$/, "")))]; }
  calculateScore({ brands, brandName, citations }) { const mention = brands.find((item) => item.brand.toLowerCase() === String(brandName).toLowerCase()); return { mentionScore: mention ? Math.max(20, 100 - (mention.position - 1) * 15) : 0, citationScore: Math.min(100, citations.length * 25) }; }
}
