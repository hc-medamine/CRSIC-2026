/**
 * Institutional site-pages overlay (CMS-published `site-pages.json`).
 * Locales stay the fallback until a successful publish.
 */

/** Keys the CMS may overlay on locale dictionaries. Keep in sync with cms/src/lib/content/sitePageKeys.ts */
export const SITE_PAGE_OVERLAY_KEYS = [
  "about_hero_tag",
  "about_hero_h1",
  "about_hero_p",
  "about_nature_p1",
  "about_nature_p2",
  "about_nature_p3",
  "about_vision_p",
  "about_mission_p",
  "about_values_p",
  "about_goals_p",
  "about_axis1",
  "about_axis2",
  "about_axis3",
  "about_axis4",
  "about_axis5",
  "about_axis6",
  "about_strat1",
  "about_strat2",
  "about_strat3",
  "about_strat4",
  "about_strat5",
  "about_strat6",
  "org_director",
  "org_director_en",
  "org_admin_council",
  "org_admin_council_en",
  "org_general_sec",
  "org_general_sec_en",
  "org_sci_council",
  "org_sci_council_en",
  "org_ext_rel",
  "org_ext_rel_sub",
  "org_research_mon",
  "org_research_mon_sub",
  "org_div1",
  "org_div2",
  "org_div3",
  "org_div4",
  "coop_hero_tag",
  "coop_hero_h1",
  "coop_hero_p",
  "coop_cta_p",
  "contact_addr_val",
  "footer_contact_addr",
];

/**
 * Overlay CMS strings onto a locale dict. Empty overlay values leave the locale text.
 * @param {Record<string, string>} base
 * @param {Record<string, string>|null|undefined} overlay
 * @returns {Record<string, string>}
 */
export function mergeSitePageDict(base, overlay) {
  const out = { ...(base || {}) };
  if (!overlay || typeof overlay !== "object") return out;
  for (const key of SITE_PAGE_OVERLAY_KEYS) {
    const v = overlay[key];
    if (typeof v === "string" && v.trim()) out[key] = v;
  }
  return out;
}

/**
 * Apply published email / phone / webmail onto contact, footer, and drawer links.
 * Missing payload leaves the hardcoded HTML.
 * @param {{ contact?: { email?: string, phone?: string, webmail_url?: string, webmail_text?: string } }|null|undefined} payload
 */
export function applySiteContact(payload) {
  const c = payload && payload.contact;
  if (!c || typeof c !== "object") return;

  const email = String(c.email || "").trim();
  const phone = String(c.phone || "").trim();
  const url = String(c.webmail_url || "").trim();
  const text = String(c.webmail_text || "").trim();

  if (email) {
    document.querySelectorAll('[data-site-contact="email"]').forEach((el) => {
      if (el.tagName === "A") el.setAttribute("href", `mailto:${email}`);
    });
    document.querySelectorAll('[data-site-contact-text="email"]').forEach((el) => {
      el.textContent = email;
    });
  }
  if (phone) {
    const tel = phone.replace(/[^\d+]/g, "");
    document.querySelectorAll('[data-site-contact="phone"]').forEach((el) => {
      if (el.tagName === "A") el.setAttribute("href", `tel:${tel}`);
    });
    document.querySelectorAll('[data-site-contact-text="phone"]').forEach((el) => {
      el.textContent = phone;
    });
  }
  if (url) {
    document.querySelectorAll('[data-site-contact="webmail"]').forEach((el) => {
      if (el.tagName === "A") el.setAttribute("href", url);
    });
    if (text) {
      document.querySelectorAll('[data-site-contact-text="webmail"]').forEach((el) => {
        el.textContent = text;
      });
    }
  }
}
