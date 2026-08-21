# PRD: Home featured news playlist (max 10)

| Field | Value |
|-------|--------|
| Status | **Approved** |
| Date | 2026-08-21 |
| Author | Stakeholder + agent |
| Owners | Product / CMS + public SPA |
| Related roadmap step | Home featured strip after WP cutover |
| Related | [2026-08-21-home-news-carousel.md](./2026-08-21-home-news-carousel.md) (3-card **أخبار المركز**); [2026-07-27-spa-laws-platforms-home.md](./2026-07-27-spa-laws-platforms-home.md) (original 3-event featured carousel) |
| Supersedes | Featured **events** on `#home-feat-carousel` (that strip becomes news). Upcoming-events teaser on Home is unchanged. |

## 1. Problem

`#home-feat-carousel` (**مستجدات المركز**) auto-picks the 3 newest **events**. Editors who own news cannot choose what the hero strip shows. Cycling every news item would duplicate the 3-card row and flood the dots. Staff need a small, reviewed playlist.

Who feels it: visitors on Home; the news Editor (Megoussi); Reviewer; Super Admin.

## 2. Goals

- News-scoped staff curate **up to 10 published news** for the featured carousel, in an explicit order.
- Four-eyes: playlist draft is not live until Reviewer or Super Admin **publishes** it.
- Public Home: kicker/CTA are **news**, links `#news/{slug}`; dots OK (≤10).
- Empty live playlist (or every picked item gone) → **3 newest news** by story date.
- **أخبار المركز** 3-card carousel still pages **all** news; featured items **may appear twice**.

**Non-goals**

- Featured **events** in this strip (events stay on the Home teaser + `#events`).
- Excluding featured items from the 3-card news row.
- Pagination, bulk ops, clone, scheduled publish, media crop, EN body parity, journals in CMS, static pages in CMS.
- Changing news JSON schema beyond a new sidecar file.
- Drag-and-drop library; native reorder (drag and/or up-down) is enough.

## 3. Users & roles

| Role | Needs |
|------|--------|
| Public visitor | See a short, intentional news hero (≤10), newest-first unless staff ordered otherwise |
| News Editor | Build/reorder the draft playlist; **cannot** publish it |
| Reviewer (news in org catalog) | View and edit the draft; **publish** to Home |
| Super Admin | Same as Reviewer plus publish |
| Other editors | No access |

## 4. Requirements

### Must have

1. **CMS desk:** one **Home featured news** screen (not a checkbox on every news form). Add / remove / reorder published news. Cap **10** — Add is disabled and the API returns 400 if an 11th is sent.
2. **Order:** staff order on the desk. If they never reorder, default **story-date descending** when items are first added.
3. **Four-eyes:** Editor + Reviewer + SA can **save the draft**. Only **Reviewer or SA** can **publish**. Publish copies the draft to live and rebuilds public JSON.
4. **Live drop:** unpublish or delete a news item **removes** it from draft and live arrays; rebuild live JSON. No silent backfill. If **zero** live ids remain → SPA fallback.
5. **Fallback:** live playlist empty or all ids missing from `news.json` → SPA shows **3 newest** `getNews()` items (already date-desc). CMS shows that Home is on fallback.
6. **SPA:** `#home-feat-carousel` reads `data/featured-news.json` `{ ids: string[] }`, resolves against `news.json` in that order (skip missing), max 10. Chrome: news kicker + CTA to `#news/{slug}`. Pause/arrows/dots unchanged. `prefers-reduced-motion` = static first slide.
7. **Same story twice:** featured ids still appear in `#home-news-grid`.
8. **Picker:** only **live/published** news. Editor may pick any live news they can access by type (news desk), not only their own drafts.

### Should have

1. AR/EN CMS labels in `labels.ts`; SPA locale keys for kicker/CTA stay in sync AR/EN.
2. Unit tests for resolve/fallback and playlist sanitize (unique, max 10).

### Nice to have

1. HTML5 drag on the ordered list in addition to up/down.

## 5. Content / data impact

| Surface | Change |
|---------|--------|
| `data/featured-news.json` | **New** `{ "ids": [] }` — ordered public news ids (same `id` as `news.json`). Empty = fallback. |
| `data/news.json` | Unchanged schema |
| `data/locales/ar.json` + `en.json` | Featured kicker/CTA become news (not event) |
| `data/CMS.md` | Document `featured-news.json` |
| CMS | Singleton `site_featured_news`; rebuild on playlist publish and on news unpublish/delete |

## 6. UX notes

- Nav: under Centre content, next to News (`/dashboard/featured-news`).
- Empty draft is allowed; publishing empty live ids is allowed (Home uses fallback).
- 11th add: button disabled + short error, no silent drop.
- Reviewer editing the draft does not require a second reviewer; **publish** is the review gate (same idea as publishing news they did not author).

## 7. Technical notes

- Vanilla SPA; no new CMS npm deps.
- Prefer sidecar JSON over a `featured_rank` on every news row (draft vs live playlist).
- SQL: `site_featured_news` id=1, `draft_ids` / `live_ids` UUID[] (content_items ids).
- Rebuild writes only ids that still have `live_payload`.
- Existing `#home-feat-carousel` id stays.

## 8. Success metrics

- Empty live file → 3 newest news in the strip; CTA opens `#news/{slug}`.
- Published playlist of 4 → those 4 in staff order; dots = 4.
- Unpublish one of them → strip shows 3 remaining; no extra backfill.
- Editor cannot publish; Reviewer/SA can.
- 3-card **أخبار المركز** still includes featured stories.
- Reduced-motion: first slide only, no autoplay.

## 9. Open questions

- None blocking.

## 10. Decision log

| Date | Decision |
|------|----------|
| 2026-08-21 | Featured strip = curated **news** playlist, max 10. Events leave this strip. |
| 2026-08-21 | Featured items also stay in the 3-card Center News row. |
| 2026-08-21 | Who: news Editor + SA edit; Reviewer view+edit; only Reviewer/SA publish. |
| 2026-08-21 | Four-eyes on the **playlist**, not republishing each article. |
| 2026-08-21 | Empty live → 3 newest news. Unpublish/delete drops; no backfill until zero. |
| 2026-08-21 | Order: staff reorder; default date-desc on add. UI refuses 11th. |
| 2026-08-21 | SPA news chrome + `#news/{slug}`; dots ≤10. |
| 2026-08-21 | Status **Approved**. |
