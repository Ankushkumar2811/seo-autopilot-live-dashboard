const SKIP_EXTENSIONS = /\.(?:jpg|jpeg|png|gif|webp|svg|pdf|zip|mp4|mp3|css|js|xml)(?:$|\?)/i;
export class LinkAnalyzer {
  normalize(href, baseUrl) { try { const url = new URL(href, baseUrl); if (!/^https?:$/.test(url.protocol) || SKIP_EXTENSIONS.test(url.pathname)) return null; url.hash = ""; url.hostname = url.hostname.toLowerCase(); if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) url.port = ""; if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, ""); return url.toString(); } catch { return null; } }
  analyze(links, pageUrl, rootUrl) { const root = new URL(rootUrl); return links.map((link) => { const target = this.normalize(link.href, pageUrl); if (!target) return null; const parsed = new URL(target); return { sourceUrl: pageUrl, targetUrl: target, anchor: link.anchor || "", internal: parsed.hostname === root.hostname, nofollow: false }; }).filter(Boolean); }
}
