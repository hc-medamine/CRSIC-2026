import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickLocaleFields } from "../content/sitePageKeys";
import { buildSitePagesPayload } from "./sitePagesJson";

describe("buildSitePagesPayload", () => {
  it("copies footer address from contact address and skips empty EN", () => {
    const payload = buildSitePagesPayload({
      fields_ar: {
        about_hero_h1: "من نحن",
        contact_addr_val: "عنوان عربي<br>سطر 2",
        about_hero_tag: "  ",
      },
      fields_en: {
        about_hero_h1: "About us",
      },
      email: "contact@crsic.dz",
      phone: "+213 29 14 61 90",
      webmail_url: "https://www.crsic.dz:2096/",
      webmail_text: "webmail.crsic.dz",
    });
    assert.equal(payload.ar.about_hero_h1, "من نحن");
    assert.equal(payload.ar.footer_contact_addr, "عنوان عربي<br>سطر 2");
    assert.equal(payload.ar.about_hero_tag, undefined);
    assert.equal(payload.en.about_hero_h1, "About us");
    assert.equal(payload.en.footer_contact_addr, "عنوان عربي<br>سطر 2");
    assert.equal(payload.contact.email, "contact@crsic.dz");
  });
});

describe("pickLocaleFields", () => {
  it("keeps only site-page keys with non-empty strings", () => {
    const out = pickLocaleFields({
      about_hero_h1: "من نحن",
      about_nature_h: "chrome",
      nav_home: "ignored",
      about_hero_tag: "",
    });
    assert.equal(out.about_hero_h1, "من نحن");
    assert.equal(out.about_nature_h, undefined);
    assert.equal(out.nav_home, undefined);
    assert.equal(out.about_hero_tag, undefined);
  });
});
