# PRD: Laws & Platforms catalog — dedicated images + scales empty mark

| Field | Value |
|-------|--------|
| Status | **Delivered** (2026-09-15) |
| Date | 2026-09-15 |
| Author | Stakeholder + agent |
| Owners | Product / public SPA (+ light CMS copy) |
| Related roadmap step | Laws & Platforms SPA hubs |
| Related | [2026-07-27-spa-laws-platforms-home.md](./2026-07-27-spa-laws-platforms-home.md) |

## 1. Problem

Law catalog cards show **meeting/news photographs** stored under `img/cms/laws/` that do not belong to decrees. Visitors see misleading covers. Imageless platform cards (e.g. mobility) have a blank media slot with no on-brand mark.

Who feels it: public visitors on `#laws` / `#platforms`.

## 2. Goals

- Use a **real cover image only when it belongs** to that law or platform item.
- When no dedicated cover exists → show a shared **green-gold scales** emblem on the catalog card (not Holders, not CRSIC logo photo, not recycled news art).
- Strip the three current misplaced law photos from public data (and orphan files).

**Non-goals**

- Scraping legacy WordPress for law art.
- Auto-detecting “looks like news” by heuristic/hash.
- Injecting the scales mark as a fake **detail** hero on `#law/{slug}` / `#platform/{slug}`.
- Changing news/events Holders or the Home featured carousel.
- Journals-in-CMS (deferred).
- Stripping existing platform covers (visual/radio) unless separately wrong.

## 3. Users & roles

| Role | Needs |
|------|--------|
| Public visitor | Honest catalog art; on-brand empty mark |
| CMS Editor | May attach a true cover later; empty → public scales mark |

## 4. Requirements

### Must have

1. Public `laws.json`: remove `img` / `img_webp` / image `media[]` entries that are the misplaced photos; delete unreferenced orphan files under `img/cms/laws/` for those hashes.
2. SPA catalog cards (laws + platforms): if no safe card image → `.catalog-card-media--empty` with inline **scales** SVG using `--green-deep` / `--gold`.
3. Detail pages: no invented scales hero; text + real attachments only.

### Should have

1. CMS list help one-liner: card image should belong to the item; otherwise public site shows the scales mark.
2. SMOKE row for `#laws` / `#platforms` empty mark.

### Nice to have

1. None.

## 5. Content / data impact

| Surface | Change |
|---------|--------|
| `data/laws.json` | Clear wrong covers on all current laws |
| `img/cms/laws/*` | Delete orphaned misplaced JPGs/WebPs |
| `data/platforms.json` | Unchanged (keep existing covers; mobility stays imageless) |
| Locales | None required for the mark (decorative) |
| CMS labels | Short help on laws/platforms pages |

## 6. UX notes

- Same scales mark for laws and platforms empty cards.
- Media aspect ratio unchanged (4/3).
- Soft cream/green wash behind the mark is fine; no stock photos.

## 7. Technical notes

- Vanilla SPA; CSS variables already define brand green/gold.
- PDF-only `media[]` does **not** count as a card cover.
- After CMS republish of a law, ensure DB `image_path` / image media cleared so rebuild does not restore wrong files (ops note if local DB still has them).

## 8. Success metrics

- `#laws` cards show scales, not meeting photos.
- Platforms with covers unchanged; mobility shows scales.
- Law detail has no fake photo hero.

## 9. Open questions

- None — Approved 2026-09-15.

## 10. Decision log

| Date | Decision |
|------|----------|
| 2026-09-15 | Scope: laws **and** platforms. |
| 2026-09-15 | Empty mark: green-gold **scales** emblem. |
| 2026-09-15 | Emblem on catalog cards only; no detail hero. |
| 2026-09-15 | No legacy scrape for **laws**; platforms may pull thematic covers from WP pages. |
| 2026-09-15 | No legacy scrape; strip current wrong law photos. |
