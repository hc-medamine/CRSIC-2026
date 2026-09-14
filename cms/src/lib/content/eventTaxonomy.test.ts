import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EVENT_CATEGORY_TYPE_AR,
  EVENT_CATEGORY_TYPE_EN,
  EVENT_SECTION_CATEGORIES,
  isValidEventPair,
  legacyScopeForCategory,
  resolveLegacyCategory,
  sectionForCategory,
} from "./eventTaxonomy";
import { buildEventPayload } from "@/lib/publish/eventsJson";

describe("eventTaxonomy", () => {
  it("locks section ↔ category pairs", () => {
    for (const [section, cats] of Object.entries(EVENT_SECTION_CATEGORIES)) {
      for (const cat of cats) {
        assert.equal(isValidEventPair(section, cat), true);
        assert.equal(sectionForCategory(cat), section);
      }
    }
    assert.equal(isValidEventPair("activities", "intl"), false);
    assert.equal(isValidEventPair("meetings", "lecture"), false);
  });

  it("resolves legacy type then scope", () => {
    assert.equal(resolveLegacyCategory("يوم دراسي", "intl"), "study_day");
    assert.equal(resolveLegacyCategory("مؤتمر دولي", "nat"), "intl");
    assert.equal(resolveLegacyCategory(null, "intl"), "intl");
    assert.equal(resolveLegacyCategory("", "nat"), "nat");
    assert.equal(resolveLegacyCategory("unknown", null), null);
  });

  it("derives legacy scope for transition", () => {
    assert.equal(legacyScopeForCategory("intl"), "intl");
    assert.equal(legacyScopeForCategory("cultural"), "intl");
    assert.equal(legacyScopeForCategory("nat"), "nat");
    assert.equal(legacyScopeForCategory("lecture"), "nat");
  });
});

describe("buildEventPayload taxonomy", () => {
  const base = {
    id: "22222222-2222-4222-8222-222222222222",
    title_ar: "ملتقى تجريبي",
    summary_ar: "ملخص",
    body_ar: "<p>متن</p>",
    event_day: "01",
    event_month: "جان",
    event_year: "2026",
    event_type_ar: "ملتقى وطني",
    event_display_status: "upcoming" as const,
    event_scope: "nat" as const,
    image_path: null,
    image_alt_ar: null,
    public_slug: "test-event",
  };

  it("writes category + section and locked type labels", () => {
    const item = buildEventPayload({
      ...base,
      event_section: "activities",
      event_category: "lecture",
    });
    assert.equal(item.category, "lecture");
    assert.equal(item.section, "activities");
    assert.equal(item.type, EVENT_CATEGORY_TYPE_AR.lecture);
    assert.equal(item.type_en, EVENT_CATEGORY_TYPE_EN.lecture);
    assert.equal(item.scope, "nat");
  });

  it("falls back via resolveLegacyCategory when columns missing", () => {
    const item = buildEventPayload(base);
    assert.equal(item.category, "nat");
    assert.equal(item.section, "meetings");
    assert.equal(item.type, EVENT_CATEGORY_TYPE_AR.nat);
  });
});
