import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAlertPayload } from "./alertsJson";
import { buildLawPayload } from "./lawsJson";

describe("buildLawPayload EN-when-ready", () => {
  it("emits en_status and gated EN fields", () => {
    const ready = buildLawPayload({
      id: "law-1",
      title_ar: "قانون",
      title_en: "Law",
      summary_ar: "ملخص",
      summary_en: "Summary",
      body_ar: "نص",
      body_en: "Body",
      en_status: "ready",
      image_path: "img/cms/laws/x.jpg",
    });
    assert.equal(ready.en_status, "ready");
    assert.equal(ready.title_en, "Law");
    assert.equal(ready.summary_en, "Summary");
    assert.equal(ready.body_en, "<p>Body</p>");
    assert.equal(ready.titleEn, undefined);
  });

  it("keeps pending without inventing EN on the public title", () => {
    const pending = buildLawPayload({
      id: "law-2",
      title_ar: "قانون",
      title_en: "Law",
      summary_ar: "ملخص",
      summary_en: "Summary",
      body_ar: "نص",
      en_status: "pending",
    });
    assert.equal(pending.en_status, "pending");
    assert.equal(pending.title, "قانون");
    assert.equal(pending.title_en, "Law");
  });
});

describe("buildAlertPayload EN-when-ready", () => {
  it("emits en_status and message_en when filled", () => {
    const out = buildAlertPayload({
      id: "alert-1",
      title_ar: "تنبيه",
      title_en: "Alert",
      alert_link_url: null,
      alert_link_label_ar: "اقرأ",
      alert_link_label_en: "Read",
      en_status: "ready",
    });
    assert.equal(out.en_status, "ready");
    assert.equal(out.message_ar, "تنبيه");
    assert.equal(out.message_en, "Alert");
    assert.equal(out.link_label_en, "Read");
  });
});
