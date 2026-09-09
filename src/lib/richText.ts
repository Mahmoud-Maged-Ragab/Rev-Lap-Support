/**
 * The "Rich Text" content element's format: a small, app-specific markdown
 * dialect (not raw HTML). Storing raw HTML from a `contentEditable` editor
 * would mean sanitizing arbitrary HTML on every render of the public issue
 * page — this sidesteps that entirely: the editor (RichTextEditor.tsx)
 * writes this syntax into a plain textarea, and `renderRichTextHtml` below
 * is the ONLY thing that turns it into HTML — it always escapes source text
 * first and only ever emits a small fixed set of tags it constructs itself,
 * so there's no way for stored text to produce anything the parser didn't
 * explicitly build.
 *
 * Supported syntax (matches the toolbar in RichTextEditor.tsx):
 *   **bold**   *italic*   __underline__   [label](url)
 *   ## Heading   ### Subheading
 *   - bullet item   1. numbered item   > quote
 * Isomorphic (no DOM APIs) — used both for the live preview in the builder
 * and for the public issue page's server-rendered HTML.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Only http(s) and same-site relative links are ever emitted as an href. */
function isSafeUrl(url: string): boolean {
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) || trimmed.startsWith("/");
}

function renderInline(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_m, label: string, url: string) =>
      `<a href="${isSafeUrl(url) ? url : "#"}" target="_blank" rel="noopener noreferrer">${label}</a>`,
  );
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  out = out.replace(/__([^_]+)__/g, "<u>$1</u>");
  return out;
}

export function isRichTextEmpty(source: string | null | undefined): boolean {
  return !source || source.trim().length === 0;
}

export function renderRichTextHtml(source: string | null | undefined): string {
  if (isRichTextEmpty(source)) return "";
  const lines = source!.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let i = 0;

  function flushParagraph() {
    if (paragraph.length > 0) {
      html.push(`<p>${paragraph.map(renderInline).join("<br />")}</p>`);
      paragraph = [];
    }
  }

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    if (trimmed === "") {
      flushParagraph();
      i++;
      continue;
    }

    const h3 = trimmed.match(/^###\s+(.+)$/);
    if (h3) {
      flushParagraph();
      html.push(`<h3>${renderInline(h3[1])}</h3>`);
      i++;
      continue;
    }
    const h2 = trimmed.match(/^##\s+(.+)$/);
    if (h2) {
      flushParagraph();
      html.push(`<h2>${renderInline(h2[1])}</h2>`);
      i++;
      continue;
    }
    const quoteFirst = trimmed.match(/^>\s?(.*)$/);
    if (quoteFirst) {
      flushParagraph();
      const buf = [quoteFirst[1]];
      i++;
      while (i < lines.length) {
        const m = lines[i].trim().match(/^>\s?(.*)$/);
        if (!m) break;
        buf.push(m[1]);
        i++;
      }
      html.push(`<blockquote>${buf.map(renderInline).join("<br />")}</blockquote>`);
      continue;
    }
    const bulletFirst = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletFirst) {
      flushParagraph();
      const items = [bulletFirst[1]];
      i++;
      while (i < lines.length) {
        const m = lines[i].trim().match(/^[-*]\s+(.+)$/);
        if (!m) break;
        items.push(m[1]);
        i++;
      }
      html.push(`<ul>${items.map((it) => `<li>${renderInline(it)}</li>`).join("")}</ul>`);
      continue;
    }
    const numberedFirst = trimmed.match(/^\d+\.\s+(.+)$/);
    if (numberedFirst) {
      flushParagraph();
      const items = [numberedFirst[1]];
      i++;
      while (i < lines.length) {
        const m = lines[i].trim().match(/^\d+\.\s+(.+)$/);
        if (!m) break;
        items.push(m[1]);
        i++;
      }
      html.push(`<ol>${items.map((it) => `<li>${renderInline(it)}</li>`).join("")}</ol>`);
      continue;
    }

    paragraph.push(trimmed);
    i++;
  }
  flushParagraph();
  return html.join("");
}
