export function markdownToHtml(markdown) {
  if (!markdown) return "";
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let listOpen = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (listOpen) {
        html.push("</ul>");
        listOpen = false;
      }
      continue;
    }

    if (line.startsWith("### ")) {
      if (listOpen) {
        html.push("</ul>");
        listOpen = false;
      }
      html.push(`<h3>${inline(line.slice(4))}</h3>`);
      continue;
    }

    if (line.startsWith("## ")) {
      if (listOpen) {
        html.push("</ul>");
        listOpen = false;
      }
      html.push(`<h2>${inline(line.slice(3))}</h2>`);
      continue;
    }

    if (line.startsWith("# ")) {
      if (listOpen) {
        html.push("</ul>");
        listOpen = false;
      }
      html.push(`<h1>${inline(line.slice(2))}</h1>`);
      continue;
    }

    if (/^- /.test(line)) {
      if (!listOpen) {
        html.push("<ul>");
        listOpen = true;
      }
      html.push(`<li>${inline(line.slice(2))}</li>`);
      continue;
    }

    if (listOpen) {
      html.push("</ul>");
      listOpen = false;
    }
    html.push(`<p>${inline(line)}</p>`);
  }

  if (listOpen) html.push("</ul>");
  return html.join("\n");
}

export function normalizeBlogContent(content) {
  if (!content) return "";
  if (/<(p|h1|h2|h3|ul|ol|li|div|section|article)\b/i.test(content)) return content;
  return markdownToHtml(content);
}

export function prepareBlogContent(content, title = "") {
  const html = normalizeBlogContent(content);
  return removeRepeatedBlocks(removeDuplicateTitle(html, title));
}

function removeDuplicateTitle(html, title) {
  if (!title) return html;
  const normalizedTitle = normalizeText(title);
  return html.replace(/^\s*<h1[^>]*>(.*?)<\/h1>\s*/i, (match, heading) => {
    return normalizeText(stripTags(heading)) === normalizedTitle ? "" : match;
  });
}

function removeRepeatedBlocks(html) {
  const seen = new Set();
  return html
    .split(/\n+/)
    .filter((block) => {
      const key = normalizeText(stripTags(block));
      if (!key || key.length < 80) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join("\n");
}

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9 ]/g, "").trim();
}

function stripTags(value) {
  return String(value || "").replace(/<[^>]+>/g, "");
}

function inline(value) {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
