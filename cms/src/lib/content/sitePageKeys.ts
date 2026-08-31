/** Locale keys authored in the Site pages singleton (bodies / labels, not chrome headings). */

export const ABOUT_KEYS = [
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
] as const;

export const ORG_KEYS = [
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
] as const;

export const COOP_KEYS = ["coop_hero_tag", "coop_hero_h1", "coop_hero_p", "coop_cta_p"] as const;

export const CONTACT_TEXT_KEYS = ["contact_addr_val"] as const;

export const SITE_PAGE_FIELD_KEYS = [
  ...ABOUT_KEYS,
  ...ORG_KEYS,
  ...COOP_KEYS,
  ...CONTACT_TEXT_KEYS,
] as const;

export type SitePageFieldKey = (typeof SITE_PAGE_FIELD_KEYS)[number];

export const SITE_PAGE_SECTIONS: { id: "about" | "org" | "contact" | "cooperation"; keys: readonly string[] }[] =
  [
    { id: "about", keys: ABOUT_KEYS },
    { id: "org", keys: ORG_KEYS },
    { id: "contact", keys: CONTACT_TEXT_KEYS },
    { id: "cooperation", keys: COOP_KEYS },
  ];

export const DEFAULT_CONTACT = {
  email: "contact@crsic.dz",
  phone: "+213 29 14 61 90",
  webmail_url: "https://www.crsic.dz:2096/",
  webmail_text: "webmail.crsic.dz",
};

export function pickLocaleFields(
  dict: Record<string, unknown>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of SITE_PAGE_FIELD_KEYS) {
    const v = dict[key];
    if (typeof v === "string" && v.trim()) out[key] = v;
  }
  return out;
}

export function isSitePageFieldKey(value: string): value is SitePageFieldKey {
  return (SITE_PAGE_FIELD_KEYS as readonly string[]).includes(value);
}

export function isLongSitePageField(key: string): boolean {
  return (
    key.includes("_p") ||
    key.startsWith("about_axis") ||
    key.startsWith("about_strat") ||
    key === "contact_addr_val"
  );
}
