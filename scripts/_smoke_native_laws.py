# -*- coding: utf-8 -*-
"""Smoke for native laws/platforms + layout restore."""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
errors: list[str] = []

def ok(m: str) -> None:
    print("OK", m)

def fail(m: str) -> None:
    errors.append(m)
    print("FAIL", m)

def main() -> None:
    laws = json.loads((ROOT / "data/laws.json").read_text(encoding="utf-8"))["laws"]
    plats = json.loads((ROOT / "data/platforms.json").read_text(encoding="utf-8"))["platforms"]
    for law in laws:
        if law.get("externalUrl"):
            fail(f"law still has externalUrl primary: {law['id']}")
        if not (law.get("body") or "").strip():
            fail(f"law missing body: {law['id']}")
        else:
            ok(f"law body {law['id']}")
    for p in plats:
        if not (p.get("body") or "").strip():
            fail(f"platform missing body: {p['id']}")
        else:
            ok(f"platform body {p['id']}")

    catalog = (ROOT / "js/components/catalogCard.js").read_text(encoding="utf-8")
    if "target: '_blank'" in catalog or "externalUrl" in catalog and "#law/" not in catalog:
        fail("catalog still uses external blank links")
    if "#law/" in catalog and "#platform/" in catalog:
        ok("catalog hash links")
    else:
        fail("catalog missing hash links")

    router = (ROOT / "js/router.js").read_text(encoding="utf-8")
    if "'law'" in router:
        ok("router law")
    else:
        fail("router law")

    detail = (ROOT / "js/components/detailPage.js").read_text(encoding="utf-8")
    if "renderLawDetail" in detail and "findLawByKey" in detail:
        ok("law detail")
    else:
        fail("law detail")
    if "item.externalUrl" in detail and "btn-primary-cta" in detail[detail.find("renderPlatformDetail"):detail.find("renderLawDetail")]:
        # platform block should not have external CTA
        plat = detail[detail.find("function renderPlatformDetail"):detail.find("function renderLawDetail")]
        if "externalUrl" in plat and "btn-primary-cta" in plat:
            fail("platform detail still has external CTA")
        else:
            ok("platform no primary external CTA")
    else:
        ok("platform external CTA check")

    css = (ROOT / "css/style.css").read_text(encoding="utf-8")
    if ".news-card img,\n.pub-card img,\n.catalog-card-media img,\n.event-thumb img" in css:
        fail("global contain still on news/pub/event")
    else:
        ok("no global contain on photo cards")
    if "@media (min-width: 1280px) {\n  .pub-grid,\n  .news-grid,\n  .events-grid {\n    grid-template-columns: repeat(5, 1fr);" in css:
        fail("global 5-up still present")
    else:
        ok("no global 5-up")
    if "clamp(1.25rem, 4vw, 2.5rem)" in css:
        ok("carousel gutters")
    else:
        fail("carousel gutters")

    laws_ts = (ROOT / "cms/src/lib/content/laws.ts").read_text(encoding="utf-8")
    if "External URL is required" in laws_ts:
        fail("laws.ts still requires external URL")
    else:
        ok("laws CMS no required URL")
    if "body_ar" in laws_ts and "sanitizeBodyHtml" in laws_ts:
        ok("laws CMS body")
    else:
        fail("laws CMS body")

    prd = (ROOT / "docs/prds/2026-07-27-spa-laws-platforms-home.md").read_text(encoding="utf-8")
    if "native SPA detail" in prd.lower() or "#law/{slug}" in prd:
        ok("PRD amended")
    else:
        fail("PRD not amended")

    if errors:
        print("\nSMOKE FAILED", len(errors))
        for e in errors:
            print(" -", e)
        raise SystemExit(1)
    print("\nSMOKE PASSED")

if __name__ == "__main__":
    main()
