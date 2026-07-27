# PRD: SPA Laws, Platforms, Home expansion & CMS types

| Field | Value |
|-------|--------|
| Status | **Approved** |
| Date | 2026-07-27 |
| Author | Stakeholder + agent |
| Owners | Product / CMS / Public SPA |
| Related roadmap step | Public SPA institutional pages + CMS catalog expansion |
| Supersedes | — |

## 1. Problem

Visitors cannot find CRSIC laws/decrees or institutional platforms on the new SPA (legacy WordPress still holds that content). Home buries News/Events below departments and publications. There is no featured showcase for recent events. About lacks a director’s word. Event status has no “ongoing” state. Catalog pages need native SPA reading, not bounce-outs to WordPress. Arabic UI should use the institutional Bahij font file already in the repo.

## 2. Goals

- Public visitors browse **Laws & decrees** and **Platforms** from the SPA navbar; cards open **native SPA detail** with extracted content.
- Editors manage laws and platforms in CMS with the same four-eyes workflow as news (rich body + optional media).
- Home puts **featured events carousel** (3 newest) then **News** then **Events** directly under the hero.
- About shows a **director’s word** block (placeholder copy/image for v1).
- Events can be marked **ongoing** and display a badge.
- Catalog grids stay readable (≈3–4 cols); photographic news/pub/event thumbs keep **cover** (not a global contain/5-up override).
- Arabic SPA + CMS use **Bahij** from `fonts/`.

**Non-goals**

- USTHB-style multi-CTA platform sidebar on the carousel.
- Automated scrape of legacy WordPress (manual extract/seed only).
- Director CMS CRUD (static/locale placeholders in v1).
- Primary CTA bounce to `crsic.dz` for laws/platforms.
- Journals-in-CMS; changing event date model beyond status.

## 3. Users & roles

| Role | Needs |
|------|--------|
| Public visitor | Read laws/platforms in SPA; clearer Home; director greeting; ongoing badge |
| Editor / Reviewer | Author laws & platforms with body/media; set event ongoing |
| Super Admin | Scopes, org catalog for new types |

## 4. Requirements

### Must have

1. **Nav:** Top-level **Laws & decrees** and **Platforms** (desktop, drawer, breadcrumbs).
2. **Laws page:** Card grid → `#law/{slug}` detail (title, summary, body, media). No primary legacy outbound CTA.
3. **Platforms page:** Hub → `#platform/{slug}` detail with body/media. No primary legacy outbound CTA.
4. **CMS types:** `law` and `platform` on `content_items` (full workflow); publish `data/laws.json`, `data/platforms.json`.
5. **Platform fields:** bilingual title/summary/body, media attachments, optional `externalUrl` (non-primary), required `platformKind`.
6. **Law fields:** bilingual title/summary/body, optional image/media; `externalUrl` optional and **not** required to publish.
7. **Home order:** Hero → Featured events carousel → News → Events → Stats → Departments → Publications.
8. **Carousel:** 3 most recent events; cover, title, short text, CTA to `#event/{slug}`; pause/arrows; reduced-motion = static first slide; section gutters aligned with home.
9. **About:** Director block (placeholder AR/EN + portrait path) without breaking layout.
10. **Event status:** `upcoming` \| `ongoing` \| `done`; SPA badge for ongoing.
11. **Cards:** Catalog grids ~3–4 columns; **do not** globally force 5-up or `contain` on news/pubs/events photographic thumbs.
12. **Font:** Relocate `bahij.eot` → `fonts/`; `@font-face` for Arabic SPA + CMS.
13. **Seed:** Manual extract of distinct laws from legacy page_id=21 and platform copy from visual/radio/mobility pages into SPA JSON bodies.

### Should have

1. Document JSON contracts in `data/CMS.md`.
2. Preview tokens for `law` and `platform`.

### Nice to have

1. Soft gold accent on carousel matching CRSIC brand (not USTHB blue).
2. SoundCloud/video embeds as media items inside platform detail (not WordPress redirects).

## 5. Content / data impact

| Surface | Change |
|---------|--------|
| `data/laws.json` | Catalog + body for SPA `#law/{slug}` |
| `data/platforms.json` | Catalog + body for SPA `#platform/{slug}` |
| `data/events.json` | `status` may be `ongoing` |
| `data/locales/ar.json`, `en.json` | Nav, page chrome, director placeholders, carousel a11y |
| `img/` / CMS media | Director placeholder; law/platform buckets |
| `fonts/bahij.eot` | Relocated from repo root |

## 6. UX notes

- Laws/Platforms: discover on hub → read in SPA detail (News-like).
- Carousel: brand-first, one CTA per slide; gutters match home sections.
- Director block: restrained; fits existing About rhythm.

## 7. Technical notes

- Clone News/Partners CMS stack for `law` / `platform`.
- One `platform` type + `platform_kind` enum.
- SPA hash router: `laws`, `platforms` pages; `law` and `platform` detail types.
- Vanilla JS carousel.
- Feature branch: `feature/spa-laws-platforms-home`.

## 8. Success metrics

- Laws/platforms open native SPA detail with substantive body; no primary CTA to crsic.dz.
- Home news/pub/event thumbs use cover again; not forced 5 skinny columns.
- Carousel padding aligns with home sections.
- Editors can publish law/platform with body end-to-end.

## 9. Open questions

- _(none)_ Director CMS ownership deferred.

## 10. Decision log

| Date | Decision |
|------|----------|
| 2026-07-27 | Home carousel = CRSIC 3 latest events only (no USTHB CTAs) |
| 2026-07-27 | Platforms = rich CMS (News-like) + optional external URL if media unavailable |
| 2026-07-27 | Director = placeholder copy/image; editors replace later |
| 2026-07-27 | Ongoing = event status badge |
| 2026-07-27 | ~~Laws card → external URL; no SPA law detail~~ **superseded** |
| 2026-07-27 | **Amendment:** Laws & Platforms = native SPA detail (`#law/{slug}`, `#platform/{slug}`) with extracted body; no primary CTA to crsic.dz |
| 2026-07-27 | **Amendment:** Revert global 5-up/`contain` on news/pubs/events; catalog ~3–4 cols; fix home carousel gutters |
| 2026-07-27 | Home order locked: Hero → carousel → News → Events → Stats → Depts → Pubs |
