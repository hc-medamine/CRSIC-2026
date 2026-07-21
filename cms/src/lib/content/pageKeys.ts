/** Phase 3 static pages: fixed set of page_key values + their page_fields JSONB key lists. */

export type PageKey = "about" | "cooperation" | "org" | "contact";

export const PAGE_KEYS: PageKey[] = ["about", "cooperation", "org", "contact"];

/** CMS list label per page_key (also used to seed title_ar/title_en on create). */
export const PAGE_KEY_LABELS: Record<PageKey, { ar: string; en: string }> = {
  about: { ar: "عن المركز", en: "About" },
  cooperation: { ar: "التعاون", en: "Cooperation" },
  org: { ar: "التنظيم الهيكلي", en: "Organisation" },
  contact: { ar: "اتصل بنا", en: "Contact" },
};

/** Allowed page_fields keys per page_key — matches SPA locale keys 1:1. */
export const PAGE_FIELD_KEYS: Record<PageKey, string[]> = {
  about: [
    "about_hero_tag",
    "about_hero_h1",
    "about_hero_p",
    "about_nature_h",
    "about_nature_p1",
    "about_nature_p2",
    "about_nature_p3",
    "about_rvgo_h",
    "about_vision_h",
    "about_vision_p",
    "about_mission_h",
    "about_mission_p",
    "about_values_h",
    "about_values_p",
    "about_goals_h",
    "about_goals_p",
    "about_axes_h",
    "about_axis1",
    "about_axis2",
    "about_axis3",
    "about_axis4",
    "about_axis5",
    "about_axis6",
    "about_strategy_h",
    "about_strat1",
    "about_strat2",
    "about_strat3",
    "about_strat4",
    "about_strat5",
    "about_strat6",
  ],
  cooperation: [
    "coop_hero_tag",
    "coop_hero_h1",
    "coop_hero_p",
    "coop_nat_h",
    "coop_intl_h",
    "coop_cta_p",
    "coop_cta_btn",
  ],
  org: [
    "org_hero_tag",
    "org_hero_h1",
    "org_hero_p",
    "org_stack_hint",
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
  ],
  contact: [
    "contact_hero_tag",
    "contact_hero_h1",
    "contact_hero_p",
    "contact_info_h",
    "contact_addr_label",
    "contact_addr_val",
    "contact_email_label",
    "contact_phone_label",
    "contact_webmail_label",
    "contact_social_h",
    "contact_form_h",
  ],
};

export function isPageKey(value: unknown): value is PageKey {
  return typeof value === "string" && (PAGE_KEYS as string[]).includes(value);
}

export function pageFieldKeysFor(pageKey: PageKey): string[] {
  return PAGE_FIELD_KEYS[pageKey];
}
