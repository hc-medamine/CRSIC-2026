# PRD: News & event cards — date, editor, reviewer, publisher

| Field | Value |
|-------|--------|
| Status | **Delivered** on `main` (2026-08-21, merge `b1c022c`) |
| Date | 2026-08-21 |
| Author | Stakeholder + agent |
| Owners | Product / SPA + CMS publish |
| Related roadmap step | Public cards after WP cutover |
| Related | [2026-08-21-wordpress-cms-spa-cutover.md](./2026-08-21-wordpress-cms-spa-cutover.md); [2026-07-19-internal-content-management.md](./2026-07-19-internal-content-management.md) (CMS author / reviewer / publisher) |
| Supersedes | — |

## 1. Problem

News is ordered by last CMS `live_at`, not by when the story happened. After the WordPress cutover most imported news share tonight’s apply timestamp, so the list is not a real calendar. Cards show title + label (news) or occurrence date (events) only. Visitors cannot see **when** a news item is from, or **who** edited / reviewed / published it. CMS already has author (`created_by`), reviewer (`review_owner` / review actions), and publisher (publish audit = Fariha Boufatah on cutover).

Who feels it: public visitors on Home and News/Events lists; institutional transparency.

## 2. Goals

- News list ordered by a **visible story date** (newest first), not by last JSON rebuild.
- Every **news and event** card (Home teasers + listing pages) shows: **date stamp**, **editor**, **reviewer**, **publisher**.
- Labels: **التحرير** / Editor; **المراجعة** / Reviewer; **النشر** / Publisher.
- Names from CMS user `name_ar` / `name_en` (SPA language). Publisher line is always **فريحة بوفاتح** / **Fariha Boufatah**.
- Public JSON carries display names only (no emails, no user ids).

**Non-goals**

- Date/byline on publication, partner, law, platform, research, journal, or alert cards.
- CMS UI to reassign editor / reviewer / publisher (deferred; ops scripts exist).
- Changing who may publish in CMS (still Reviewer four-eyes).
- SPA list pagination (deferred ~200-row trigger).
- EN editorial body parity; media crop; journals in CMS; static pages in CMS.
- Showing CMS `display_name` / email on the public site.

## 3. Users & roles

| Role | Needs |
|------|--------|
| Public visitor | Date + byline on news/event cards in AR or EN |
| Editor | Their public name as التحرير / Editor on items they authored |
| Reviewer | Their public name as المراجعة / Reviewer |
| Publisher (public credit) | Always Fariha Boufatah / فريحة بوفاتح as النشر / Publisher |
| Super Admin / ops | Rebuild JSON so names/dates stay in sync after publish |

## 4. Requirements

### Must have

1. **Surfaces:** Home news teasers, `#page-news` cards, Home event rows, `#page-events` cards (`createNewsCard`, `createHomeEventCard`, `createEvCard`).
2. **News date:** ISO date on each news item (`date`, `YYYY-MM-DD`).
   - **Imported / WP-cutover news:** WordPress article date (`article:published_time` / listing datetime), not apply/`live_at`.
   - **Future items published through the CMS workflow:** CMS `published_at` (date part).
3. **News sort:** SPA and `news.json` order by that `date` descending (unknown date last).
4. **Event date stamp:** keep the **occurrence** date already on the card (`day` / `month` / `year`) for **all** events (imported and future CMS). Do **not** replace it with CMS publish time. Byline (editor/reviewer/publisher) is additional, not a second calendar.
5. **Editor:** `created_by` → `name_ar` / `name_en` (fallback `display_name` if a name is empty).
6. **Reviewer:** `review_owner_id` if set, else last review-role actor on the item; same name fields.
7. **Publisher:** always **فريحة بوفاتح** / **Fariha Boufatah** on public news/event JSON (fixed institutional credit). Not the last audit actor if that person changes.
8. **Locale chrome:** `data/locales/ar.json` + `en.json` keys in sync: التحرير / Editor, المراجعة / Reviewer, النشر / Publisher. Names switch with `?lang=`.
9. **Publish path:** `buildNewsPayload` / `buildEventPayload` and rebuilds include date + byline so every future CMS publish stays correct.
10. **Backfill:** one-shot (or cutover re-run of dates only) to set news `date` from WP for current imported rows; bylines from current `created_by` / `review_owner_id`.

### Should have

1. Same date + byline block on **news and event detail** pages (lightbox / `#news/{slug}` / `#event/{slug}`) so card and detail agree.
2. Compact byline under the title (date on its own line or start; three labeled names wrapping on small screens).
3. If editor or reviewer name is missing, omit that line (do not show email). Publisher line always present on these cards.

### Nice to have

1. `<time datetime="YYYY-MM-DD">` on the news date for accessibility.
2. Ops note in CMS-OPS: public publisher credit is fixed to Boufatah until a later PRD.

## 5. Content / data impact

| Surface | Change |
|---------|--------|
| `data/news.json` | Add `date` (`YYYY-MM-DD` or `""`); `editor_ar` / `editor_en`; `reviewer_ar` / `reviewer_en`; `publisher_ar` / `publisher_en`. Sort by `date` desc. |
| `data/events.json` | Same byline fields on each intl/nat item. Occurrence `day`/`month`/`year` unchanged. |
| `data/locales/ar.json` + `en.json` | New keys for the three labels; key sets stay in sync |
| CMS `live_payload` | Fields above persisted so rebuild is idempotent |
| SPA cards / details | Render byline; news list uses JSON order (already rebuilt sorted) |
| Other JSON | Unchanged |

## 6. UX notes

- News card: existing label + title, then date, then three labeled names.
- Event card: keep day/month/year badge; add the same byline under the title (do not duplicate the calendar as a fourth date).
- AR RTL / EN LTR; Bahij / existing type. No new public brand colours.
- Publisher is always the same person by design; still show the line so visitors see النشر.

## 7. Technical notes

- Extend `buildNewsPayload` / `buildEventPayload` + rebuild `ORDER BY` for news (`date` desc, then `live_at`).
- Join `users` on `created_by` and `review_owner_id`; never emit `email` or user UUID in public JSON.
- News WP date backfill: match existing public slugs/titles to WP `datetime` (same hubs as cutover) **or** store `source_published_at` on apply in a follow-up script. Do not use tonight’s `live_at`.
- Future CMS publish: set news `date` from `published_at::date` when no imported WP date is stored (column or payload flag `date_source`: `wp` \| `cms`).
- Events: no new date field required for the stamp (occurrence fields already exist).

## 8. Success metrics

- News list is calendar-newest-first; a 2024 WP story sorts below a 2026 WP story.
- Spot-check Home + news/events lists in AR and EN: date + التحرير/المراجعة/النشر visible; publisher is Boufatah.
- CMS publish of a new news item shows today’s `published_at` date after rebuild.
- Event cards still show the conference/workshop day, not the JSON rebuild day.

## 9. Open questions

- None blocking. Publisher stays fixed Boufatah even if another Reviewer publishes later (explicit stakeholder lock). Revisit only with a new PRD.

## 10. Decision log

| Date | Decision |
|------|----------|
| 2026-08-21 | Cards: **news + events** only (Home + lists). Details should match. |
| 2026-08-21 | News date: WP article date for imported; CMS `published_at` for future CMS publishes. News JSON sorted by that date desc. |
| 2026-08-21 | Event date stamp: **occurrence** `day`/`month`/`year` for imported **and** future CMS events (not CMS publish time). |
| 2026-08-21 | Names: editor + reviewer from CMS user AR/EN. Labels التحرير / Editor, المراجعة / Reviewer. |
| 2026-08-21 | Publisher on public cards: **always** فريحة بوفاتح / Fariha Boufatah. Label النشر / Publisher. |
| 2026-08-21 | Public JSON: display names only. Out of scope: other types, pagination, CMS reassign UI. |
| 2026-08-21 | If reviewer and publisher are the same person, show one line: المراجعة والنشر / Reviewer & Publisher. |
