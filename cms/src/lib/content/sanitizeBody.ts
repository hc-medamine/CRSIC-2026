import sanitizeHtml from "sanitize-html";

/** PRD H1 allowlist: p, br, strong/b, em/i, ul/ol/li, a[href] only. */
export const BODY_ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "ul",
  "ol",
  "li",
  "a",
] as const;

const SANITIZE_OPTS: sanitizeHtml.IOptions = {
  allowedTags: [...BODY_ALLOWED_TAGS],
  allowedAttributes: {
    a: ["href"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
};

function escapeText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Convert legacy plain-text bodies to simple paragraph HTML. */
export function plainTextToBodyHtml(text: string): string {
  const chunks = text
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (chunks.length === 0) {
    const one = text.trim();
    if (!one) return "";
    return `<p>${escapeText(one).replace(/\n/g, "<br />")}</p>`;
  }
  return chunks
    .map((chunk) => `<p>${escapeText(chunk).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

export function looksLikeHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value);
}

/**
 * Sanitize editorial body HTML to the H1 allowlist.
 * Plain text is wrapped into paragraphs first.
 * Returns null for empty result.
 */
export function sanitizeBodyHtml(raw: string | null | undefined): string | null {
  const input = typeof raw === "string" ? raw.trim() : "";
  if (!input) return null;
  const prepared = looksLikeHtml(input) ? input : plainTextToBodyHtml(input);
  const clean = sanitizeHtml(prepared, SANITIZE_OPTS).trim();
  return clean || null;
}

/** HTML suitable for seeding a contenteditable surface. */
export function bodyHtmlForEditor(raw: string | null | undefined): string {
  const sanitized = sanitizeBodyHtml(raw);
  return sanitized || "<p></p>";
}
