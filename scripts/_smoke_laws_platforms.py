# -*- coding: utf-8 -*-
"""Structural smoke for SPA laws/platforms/home slice."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
errors: list[str] = []


def ok(msg: str) -> None:
    print("OK", msg)


def fail(msg: str) -> None:
    errors.append(msg)
    print("FAIL", msg)


def main() -> None:
    laws = json.loads((ROOT / "data/laws.json").read_text(encoding="utf-8"))
    platforms = json.loads((ROOT / "data/platforms.json").read_text(encoding="utf-8"))
    if len(laws.get("laws", [])) >= 3:
        ok(f"laws seed count={len(laws['laws'])}")
    else:
        fail("laws seed < 3")
    for law in laws["laws"]:
        if not law.get("externalUrl"):
            fail(f"law missing externalUrl: {law.get('id')}")
    if len(platforms.get("platforms", [])) == 3:
        ok("platforms seed 3 kinds")
    else:
        fail("platforms seed count")
    kinds = {p.get("kind") for p in platforms["platforms"]}
    if kinds == {"visual", "radio", "mobility"}:
        ok("platform kinds")
    else:
        fail(f"platform kinds {kinds}")

    ar = json.loads((ROOT / "data/locales/ar.json").read_text(encoding="utf-8"))
    en = json.loads((ROOT / "data/locales/en.json").read_text(encoding="utf-8"))
    for key in (
        "nav_laws",
        "nav_platforms",
        "feat_carousel_cta",
        "director_quote",
        "ev_badge_ongoing",
        "bc_laws",
        "bc_platforms",
    ):
        if key not in ar or key not in en:
            fail(f"locale missing {key}")
        else:
            ok(f"locale {key}")

    html = (ROOT / "index.html").read_text(encoding="utf-8")
    for needle in (
        'id="page-laws"',
        'id="page-platforms"',
        'id="home-feat-carousel"',
        'data-page="laws"',
        'data-page="platforms"',
        "director-word",
        'id="laws-grid"',
        'id="platforms-grid"',
    ):
        if needle in html:
            ok(f"html {needle}")
        else:
            fail(f"html missing {needle}")

    # Home order: carousel before news before events
    i_feat = html.find("home-feat-carousel")
    i_news = html.find("home-news-grid")
    i_ev = html.find("home-events-grid")
    if 0 <= i_feat < i_news < i_ev:
        ok("home section order")
    else:
        fail("home section order wrong")

    ui = (ROOT / "js/ui.js").read_text(encoding="utf-8")
    for needle in ("mountFeaturedCarousel", "createLawCard", "bc_laws", "getLaws"):
        if needle in ui:
            ok(f"ui {needle}")
        else:
            fail(f"ui missing {needle}")

    router = (ROOT / "js/router.js").read_text(encoding="utf-8")
    if "'platform'" in router:
        ok("router platform")
    else:
        fail("router platform")

    detail = (ROOT / "js/components/detailPage.js").read_text(encoding="utf-8")
    if "renderPlatformDetail" in detail and "findPlatformByKey" in detail:
        ok("detail platform")
    else:
        fail("detail platform")

    css = (ROOT / "css/style.css").read_text(encoding="utf-8")
    for needle in ("Bahij", ".g5", ".feat-carousel", ".catalog-card", ".director-word", "event-badge-ongoing"):
        if needle in css:
            ok(f"css {needle}")
        else:
            fail(f"css missing {needle}")

    if (ROOT / "fonts/bahij.eot").exists():
        ok("fonts/bahij.eot")
    else:
        fail("fonts/bahij.eot missing")

    for path in (
        "cms/src/lib/content/laws.ts",
        "cms/src/lib/content/platforms.ts",
        "cms/src/lib/publish/lawsJson.ts",
        "cms/src/lib/publish/platformsJson.ts",
        "cms/sql/026_laws_platforms_ongoing.sql",
        "cms/src/app/dashboard/laws/law-form.tsx",
        "cms/src/app/dashboard/platforms/platform-form.tsx",
    ):
        p = ROOT / path
        if p.exists():
            ok(path)
        else:
            fail(f"missing {path}")

    laws_ts = (ROOT / "cms/src/lib/content/laws.ts").read_text(encoding="utf-8")
    if "\\UPDATE" in laws_ts or "public_slug = \\" in laws_ts:
        fail("laws.ts still has corrupted SQL")
    else:
        ok("laws.ts SQL clean")
    plat_ts = (ROOT / "cms/src/lib/content/platforms.ts").read_text(encoding="utf-8")
    if "platform_kind" not in plat_ts or 'canAccessContentType(user, "platform")' not in plat_ts:
        fail("platforms.ts incomplete")
    else:
        ok("platforms.ts kind+perm")
    if "\\UPDATE" in plat_ts:
        fail("platforms.ts corrupted SQL")
    else:
        ok("platforms.ts SQL clean")

    cms_md = (ROOT / "data/CMS.md").read_text(encoding="utf-8")
    if "laws.json" in cms_md and "platforms.json" in cms_md:
        ok("CMS.md contracts")
    else:
        fail("CMS.md contracts")

    # RTL locale keys present for both langs
    if ar.get("nav_laws") and en.get("nav_laws"):
        ok("AR/EN nav laws")

    if errors:
        print("\nSMOKE FAILED:", len(errors))
        for e in errors:
            print(" -", e)
        raise SystemExit(1)
    print("\nSMOKE PASSED")


if __name__ == "__main__":
    main()
