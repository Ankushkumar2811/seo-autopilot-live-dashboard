export class TopicalAuthorityEngine {
  generate(project) {
    const services = list(project.services, [project.industry || "business growth"]), locations = list(project.locations);
    return services.flatMap((service, index) => {
      const topic = title(service), local = locations[0], pillar = `Complete ${topic} Guide${local ? ` for ${local}` : ""}`;
      return [{ topic, primaryKeyword: `${service}${local ? ` in ${local}` : ""}`, secondaryKeywords: [`best ${service}`, `${service} guide`, `${service} services`, local && `local ${service} ${local}`].filter(Boolean), searchIntent: local ? "Local" : "Commercial", difficulty: 45 + index * 4, priority: Math.max(50, 95 - index * 5), businessValue: "high", contentType: "pillar", targetPage: `/${slug(service)}/`, status: "planned", pillar }, ...["guide", "cost", "benefits", "comparison", "mistakes"].map((angle, child) => ({ topic, primaryKeyword: `${service} ${angle}${local && child < 2 ? ` ${local}` : ""}`, secondaryKeywords: [`${service} tips`, `${service} for ${project.targetAudience || "businesses"}`], searchIntent: angle === "cost" ? "Transactional" : angle === "comparison" ? "Commercial" : "Informational", difficulty: 30 + child * 5, priority: 80 - child * 6, businessValue: child < 2 ? "high" : "medium", contentType: "supporting", targetPage: `/blog/${slug(`${service}-${angle}`)}/`, status: "planned", pillar }))];
    });
  }
  score(clusters, documents) { const planned = Math.max(1, clusters.length), published = documents.filter((item) => item.status === "published").length, coveredTopics = new Set(documents.filter((item) => item.status === "published").map((item) => String(item.topic || "").toLowerCase())).size, topicCount = Math.max(1, new Set(clusters.map((item) => item.topic.toLowerCase())).size); return Math.round(Math.min(100, published / planned * 70 + coveredTopics / topicCount * 30)); }
}
function list(value, fallback = []) { const out = Array.isArray(value) ? value : String(value || "").split(","), cleaned = out.map((item) => String(item).trim()).filter(Boolean); return cleaned.length ? cleaned : fallback; }
function title(value) { return String(value).replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function slug(value) { return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
