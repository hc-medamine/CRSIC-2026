# PRD: Home featured playlist — news + events

| Field | Value |
|-------|--------|
| Status | **Delivered** (2026-09-15) |
| Date | 2026-09-15 |
| Author | Stakeholder + agent |
| Owners | Product / CMS + public SPA |
| Related roadmap step | Home featured strip |
| Related | [2026-08-21-home-featured-news-playlist.md](./2026-08-21-home-featured-news-playlist.md) (**Delivered** — news-only) |
| Supersedes | News-only scope of that PRD for the Home featured strip (playlist still four-eyes, max 10) |

## 1. Problem

The Home featured carousel (`#home-feat-carousel`) can only surface **news**. Centre staff also need curated **events** in the same hero strip without a second playlist or losing four-eyes review.

Who feels it: visitors on Home; news-desk Editors; Reviewers; Super Admin.

## 2. Goals

- One **mixed ordered playlist** of **news and/or events**, max **10** total.
- Same four-eyes: draft → Reviewer/SA **publish** → live public JSON.
- Empty live playlist (or every entry unresolved) → SPA fallback: merge published news + events that **have a cover image**, by date descending, take **top 10** (skip imageless so the strip does not reuse Holders).
- Kicker stays **«أخبار مميزة»** / EN equivalent on **every** slide (including events).
- Event slide CTA → public event detail (`#event/{slug}`); news CTA → `#news/{slug}`.
- Featured items **may still appear** in **أخبار المركز** and the Home events teaser.

**Non-goals**

- Publications, partners, alerts, laws, platforms, research, journals in this playlist.
- A second featured playlist.
- Excluding featured items from other Home rows.
- Changing who can edit: remains **news-desk staff only** (Editors with news scope + Reviewers/SA as today) — even when adding events.
- Drag library redesign beyond current up/down (+ optional drag).
- Scheduled publish; Journals-in-CMS.

## 3. Users & roles

| Role | Needs |
|------|--------|
| Public visitor | Mixed hero strip ≤10; clear CTA to news or event detail |
| News Editor | Build/reorder draft playlist (may add published news **and** published events); cannot publish |
| Reviewer (as today for featured desk) | Edit draft; **publish** |
| Super Admin | Same as Reviewer plus publish |
| Event-only Editor (no news desk) | **No** playlist access (unchanged gate) |

## 4. Requirements

### Must have

1. **CMS desk** renamed in UI to **Home featured playlist** (route may stay `/dashboard/featured-news` to avoid churn). Add / remove / reorder; picker offers **published news** and **published events** (type filter or grouped select). Cap **10** total.
2. **Public JSON** becomes typed ordered entries, e.g. `{ "items": [ { "type": "news"|"event", "id": "<public id>" } ] }` (filename may stay `featured-news.json` or rename — prefer keep filename + `items` with **migration**: legacy `{ "ids": [...] }` treated as news-only).
3. **CMS storage:** extend singleton so each playlist entry carries **type + content_items UUID** (not bare id alone). Migrate existing `draft_ids` / `live_ids` as **news**.
4. **Four-eyes** unchanged: save draft vs publish live; publish rebuilds public JSON.
5. **Live drop:** unpublish/delete/recycle of a **news or event** that is on the playlist removes that entry from draft and live; rebuild. No silent backfill.
6. **SPA resolve:** load playlist items in order; skip missing; cap 10. Empty → merge `getNews()` + all events by story/event date desc → first 10 **that have a cover image**. Tag each slide with type for CTA.
7. **Chrome:** one kicker key for all slides (`feat_carousel_kicker`). CTA href by type: news → `#news/{slug}`, event → `#event/{slug}` (existing SPA detail routes; stakeholder “`#events/…`” maps to this).
8. **Access:** playlist API/UI remains news-desk gated as today.

### Should have

1. CMS labels AR/EN updated (“playlist”, add event, etc.).
2. Unit tests: normalize/migrate legacy ids; mixed resolve; fallback merge top 10; sanitize unique by (type,id) max 10.
3. CMS fallback banner text mentions mixed news+events (up to 10).

### Nice to have

1. Keep HTML5 drag reorder if already present.

## 5. Content / data impact

| Surface | Change |
|---------|--------|
| `data/featured-news.json` | `items: { type, id }[]`; empty `items` = fallback; accept legacy `ids` as news |
| `news.json` / events JSON | Unchanged schemas |
| Locales | Kicker unchanged; CTA label may stay generic “اقرأ الخبر” or stay as today unless copy pass |
| `data/CMS.md` | Document typed playlist |
| CMS SQL | Migration for typed draft/live entries |

## 6. UX notes

- Nav label: **Home featured playlist**.
- Empty publish allowed → Home uses fallback.
- 11th add: disabled + error.
- List rows show type chip (news / event).

## 7. Technical notes

- Vanilla SPA; no new CMS npm deps.
- Rebuild writes only entries that still have live payload of the correct type.
- Event date for fallback sort: same ordering used elsewhere for “newest” events (document in impl).
- Motion polish on the carousel stays as-is.

## 8. Success metrics

- Publish mix of 3 news + 2 events → Home shows those 5 in order; event CTA opens `#event/{slug}`; kicker identical on all.
- Empty live → ≤10 newest **with images** by merged date (news+events).
- Unpublish a featured event → removed from strip; no backfill.
- Event-only Editor cannot open playlist desk.
- News still may appear in Center News; events still may appear in Home events teaser.

## 9. Open questions

- None blocking — CTA hash uses existing `#event/{slug}`.

## 10. Decision log

| Date | Decision |
|------|----------|
| 2026-09-15 | One mixed playlist, max 10. |
| 2026-09-15 | Empty fallback: merge news+events by date, take top 10. |
| 2026-09-15 | Fallback skips items without a cover image (prefer illustrated articles). |
| 2026-09-15 | Kicker «أخبار مميزة» for all slides; event CTA → event detail. |
| 2026-09-15 | Editors: news-desk staff only. |
| 2026-09-15 | Duplicates on other Home rows allowed. |
| 2026-09-15 | UI name “Home featured playlist”; pubs/partners/etc. out; no second playlist. |
