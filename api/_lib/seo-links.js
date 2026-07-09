export function getKeywordConfig() {
  const keywords = (process.env.AUTOPILOT_KEYWORDS || process.env.AUTOPILOT_KEYWORD || "")
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
  const linkUrl = process.env.AUTOPILOT_LINK_URL || process.env.WP_SITE_URL || "https://unnatix.in";
  return { keywords: dedupe(keywords), linkUrl };
}

export function linkKeywordsInHtml(html, keywords, linkUrl) {
  if (!html || !keywords?.length || !linkUrl) return html;
  const linked = new Set();
  const parts = html.split(/(<[^>]+>)/g);

  return parts
    .map((part) => {
      if (!part || part.startsWith("<")) return part;
      let output = part;
      for (const keyword of keywords) {
        const key = keyword.toLowerCase();
        if (linked.has(key)) continue;
        const pattern = new RegExp(`\\b(${escapeRegex(keyword)})\\b`, "i");
        if (!pattern.test(output)) continue;
        output = output.replace(pattern, `<a href="${escapeHtml(linkUrl)}" target="_blank" rel="noopener">$1</a>`);
        linked.add(key);
      }
      return output;
    })
    .join("");
}

export function keywordInstruction() {
  const { keywords, linkUrl } = getKeywordConfig();
  if (!keywords.length) return "";
  return `\nInclude these target keywords naturally in the content: ${keywords.join(", ")}. The publishing layer will internally link each keyword once to ${linkUrl}.`;
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
