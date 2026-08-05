const text = (value) => String(value || "").replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim();
const attr = (tag, name) => (tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i")) || [])[1] || "";
const meta = (html, name) => { const tag = (html.match(new RegExp(`<meta\\b(?=[^>]*(?:name|property)=["']${name}["'])[^>]*>`, "i")) || [])[0]; return tag ? attr(tag, "content") : ""; };

export class PageParser {
  parse({ html, url, status, durationMs, contentType, finalUrl }) {
    const title = text((html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1]);
    const headings = {};
    for (let level = 1; level <= 6; level++) headings[`h${level}`] = [...html.matchAll(new RegExp(`<h${level}\\b[^>]*>([\\s\\S]*?)<\\/h${level}>`, "gi"))].map((match) => text(match[1])).filter(Boolean);
    const canonicalTag = (html.match(/<link\b(?=[^>]*rel=["'][^"']*canonical[^"']*["'])[^>]*>/i) || [])[0];
    const robots = meta(html, "robots");
    const bodyText = text((html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i) || [])[1] || html);
    return { url, finalUrl: finalUrl || url, status, durationMs, contentType, title, description: meta(html, "description"), canonical: canonicalTag ? attr(canonicalTag, "href") : "", robots, indexable: !/\bnoindex\b/i.test(robots), headings, bodyText, wordCount: bodyText ? bodyText.split(/\s+/).length : 0, language: attr((html.match(/<html\b[^>]*>/i) || [])[0], "lang"), links: [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)].map((match) => ({ href: match[1], anchor: text(match[0]) })), images: [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => ({ src: attr(match[0], "src"), alt: attr(match[0], "alt"), width: Number(attr(match[0], "width")) || null, height: Number(attr(match[0], "height")) || null })), schemaBlocks: [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1].trim()) };
  }
}
