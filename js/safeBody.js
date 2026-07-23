/**
 * Safe body HTML for public detail pages (PRD H1 allowlist).
 * Rebuilds a DOM tree — never assigns unsanitized innerHTML to live nodes.
 */

const ALLOWED = new Set(["p", "br", "strong", "b", "em", "i", "ul", "ol", "li", "a"]);

/**
 * @param {string} href
 * @returns {boolean}
 */
function isSafeHref(href) {
  const t = String(href || "").trim();
  if (!t) return false;
  if (t.startsWith("#") || t.startsWith("/")) return true;
  try {
    const u = new URL(t, window.location.href);
    return u.protocol === "http:" || u.protocol === "https:" || u.protocol === "mailto:";
  } catch {
    return false;
  }
}

/**
 * @param {string} text
 * @returns {HTMLElement[]}
 */
export function paragraphsFromPlainText(text) {
  const chunks = String(text || "")
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (chunks.length === 0 && text && String(text).trim()) {
    const p = document.createElement("p");
    p.className = "detail-body-p";
    p.textContent = String(text).trim();
    return [p];
  }
  return chunks.map((chunk) => {
    const p = document.createElement("p");
    p.className = "detail-body-p";
    p.textContent = chunk;
    return p;
  });
}

/**
 * @param {Node} node
 * @returns {Node|null}
 */
function cloneSafeNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const t = node.textContent;
    if (!t) return null;
    return document.createTextNode(t);
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const name = /** @type {Element} */ (node).tagName.toLowerCase();
  if (!ALLOWED.has(name)) {
    const frag = document.createDocumentFragment();
    Array.from(node.childNodes).forEach((child) => {
      const c = cloneSafeNode(child);
      if (c) frag.appendChild(c);
    });
    return frag.childNodes.length ? frag : null;
  }

  const el = document.createElement(name);
  if (name === "p") el.className = "detail-body-p";
  if (name === "li") el.className = "detail-body-li";
  if (name === "a") {
    const href = /** @type {Element} */ (node).getAttribute("href") || "";
    if (isSafeHref(href)) {
      el.setAttribute("href", href);
      el.setAttribute("rel", "noopener noreferrer");
      if (/^https?:/i.test(href)) el.setAttribute("target", "_blank");
    }
  }

  Array.from(node.childNodes).forEach((child) => {
    const c = cloneSafeNode(child);
    if (!c) return;
    if (c.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      Array.from(c.childNodes).forEach((n) => el.appendChild(n));
    } else {
      el.appendChild(c);
    }
  });
  return el;
}

/**
 * @param {string} raw
 * @returns {Node[]}
 */
export function nodesFromSafeBody(raw) {
  const text = String(raw || "").trim();
  if (!text) return [];
  if (!/<[a-z][\s\S]*>/i.test(text)) {
    return paragraphsFromPlainText(text);
  }

  const doc = new DOMParser().parseFromString(`<div id="crs-body-root">${text}</div>`, "text/html");
  const root = doc.getElementById("crs-body-root");
  if (!root) return paragraphsFromPlainText(text);

  /** @type {Node[]} */
  const out = [];
  Array.from(root.childNodes).forEach((child) => {
    const c = cloneSafeNode(child);
    if (!c) return;
    if (c.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      Array.from(c.childNodes).forEach((n) => out.push(n));
    } else if (c.nodeType === Node.TEXT_NODE) {
      const t = (c.textContent || "").trim();
      if (!t) return;
      const p = document.createElement("p");
      p.className = "detail-body-p";
      p.textContent = t;
      out.push(p);
    } else {
      out.push(c);
    }
  });
  return out.length ? out : paragraphsFromPlainText(text.replace(/<[^>]+>/g, " "));
}
