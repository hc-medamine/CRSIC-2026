# CRSIC 2026 — Work Log

Living record of architectural and feature work. **Append new changelog entries at the top.**

| Doc | Role |
|-----|------|
| [docs/README.md](./README.md) | Documentation index |
| [audits/AUDIT.md](./audits/AUDIT.md) | **Closed** — all P0–P3 findings resolved |
| [../data/README.md](../data/README.md) | Public JSON / locale editor guide |
| [../data/CMS.md](../data/CMS.md) | `CONTENT_BASE_URL` publish contract |
| [../README.md](../README.md) | Living project source of truth (incl. Git workflow §5) |
| [qa/SMOKE.md](./qa/SMOKE.md) | Pre-merge smoke checklist (~5 min) |
| [audits/PARITY.md](./audits/PARITY.md) | AR/EN parity matrix (partial EN) |
| [audits/UIUX.md](./audits/UIUX.md) | UI/UX audit findings + fix log |
| [prds/](./prds/) | Future product requirement documents |
| **WORKLOG.md** | This file |

Only root [README.md](../README.md) remains at the project root; other docs live under `docs/`.

---

### 2026-08-24 — CMS Desk production boost **implementing**

[prds/2026-08-24-cms-desk-production-boost.md](./prds/2026-08-24-cms-desk-production-boost.md). SA `/dashboard/import-export` (CMS zip, new drafts only); edit-form cover crop + `img_card`; public EN for news/events/publications/partners when `en_status` is ready.

---

### 2026-08-24 — CMS Desk production boost **Approved** (implement)

[prds/2026-08-24-cms-desk-production-boost.md](./prds/2026-08-24-cms-desk-production-boost.md). Super Admin zip import/export (CMS items + files → new drafts), cover crop + card variant, EN stories show when ready. Static pages, journals, scheduled publish stay out.

---

### 2026-08-24 — PRD **Draft**: CMS Desk production boost

Locked via Q&A. [prds/2026-08-24-cms-desk-production-boost.md](./prds/2026-08-24-cms-desk-production-boost.md). One PRD for leftover production work: Super Admin zip import/export (CMS items + files → new drafts), cover crop + card variant, EN stories show when ready. Static pages, journals, scheduled publish stay out. Clone Cut 1 unchanged; clone later I/E cuts superseded when this PRD is Approved. **Do not implement until Approved.**

---

### 2026-08-24 — CMS table header sort **Delivered** (PR #43)

Hs1–Hs4 passed (Hs2 on two junk news rows in the bin). [PR #43](https://github.com/hc-medamine/CRSIC-2026/pull/43). Sort is this visit only; no URL `?sort=`.

---

### 2026-08-24 — CMS table header sort smoke Hs1, Hs3, Hs4

Walk on `feature/cms-table-header-sort`: Hs1 news Title A→Z (no `?sort=`); Load more order checked on events (21 rows). Hs3 org-units Sort reverse is view-only (`sort_order` unchanged in API). Hs4 leave news → Home → back = newest first. Hs2 skipped — recycle bin empty. Duplicate `ALL_CONTENT_TYPES` import in users manager fixed during the walk.

---

### 2026-08-24 — CMS table header sort **Approved** (implement)

[prds/2026-08-24-cms-table-header-sort.md](./prds/2026-08-24-cms-table-header-sort.md). Click data headers on CMS `<table>`s (nine content lists, recycle bin, users, org units, Home editor matrix). This visit only — no URL, no `localStorage`. Load more keeps the active ORDER BY. Checkbox/Actions and revision-history stay unsorted.

---

### 2026-08-24 — PRD **Draft**: CMS table header sort

Locked with stakeholder. [prds/2026-08-24-cms-table-header-sort.md](./prds/2026-08-24-cms-table-header-sort.md). Click data headers on every CMS `<table>` (nine content lists, recycle bin, users, org units, Home editor matrix). This visit only. Load more keeps the sort. Checkbox/Actions and revision-history out. **Superseded same day — Approved (entry above).**

---

### 2026-08-24 — CMS clone Cut 1 smoke Cl1–Cl8

Walkthrough on `feature/cms-clone-cut-1`: Cl1–Cl8 passed (Reviewer Fariha news edit/list/bulk Duplicate; Editor Iman partners/events row+edit Duplicate + Recycle, no Unpublish/bulk Duplicate; bin has no Duplicate; four-eyes on own copy). [SMOKE-CMS.md](./qa/SMOKE-CMS.md) Cl1–Cl8 ticked. Walk clone drafts cancelled (left the news list). Public JSON hashes unchanged. Merged to `main` as PR #42. JSON import/export still later.

---

### 2026-08-24 — Idea: CMS list table headers sort by that column

**Workflow step 1 (idea only).** Stakeholder: clicking a CMS table **column header** (the header title) should sort the rows by the values in that column. Not developed, no PRD, no code.

**Next:** superseded same day — lock + Draft PRD (entry above).

---

### 2026-08-24 — Clone Cut 1 merged with Editor recycle (`main` PR #41)

`feature/cms-clone-cut-1` includes Editor recycle from `main`. Bulk Duplicate stays Reviewer/SA; Editors keep Recycle (no Unpublish) plus row/edit Duplicate. Walkthrough Cl1–Cl8 next. JSON import/export still later.

---

### 2026-08-23 — PRD **Approved**: CMS clone Cut 1

[prds/2026-08-22-cms-clone-import-export.md](./prds/2026-08-22-cms-clone-import-export.md). Duplicate any visible non-recycled item to a new draft (confirm; stay on source; Open / Cancel clone / Close). Keep source org; empty media; stacked ` (نسخة)` OK. **Branch:** `feature/cms-clone-cut-1`. Import/export later cuts stay unimplemented.

---

### 2026-08-24 — CMS Editor recycle smoke Er1–Er6

Walkthrough on `feature/cms-editor-recycle`: Er1–Er6 passed (Editor Iman partners/events; Reviewer skip `not_sa`; SA draft recycle skipped `wrong_status`; public JSON hashes unchanged). [SMOKE-CMS.md](./qa/SMOKE-CMS.md) Er1–Er6 ticked. Walkthrough `Er-walk` partners withdrawn then recycled (left the list). Clone Cut 1 PR still **wait**.

---

### 2026-08-23 — Implementing CMS Editor recycle

**Branch:** `feature/cms-editor-recycle`. **PRD:** [prds/2026-08-23-cms-editor-recycle.md](./prds/2026-08-23-cms-editor-recycle.md) **Approved**. Editors: bulk + edit-page Recycle on own draft/rejected; bin page own scoped rows + Restore. SA unpublished recycle and purge unchanged. Reviewer unchanged. Clone PR still **wait**.

---

### 2026-08-23 — PRD **Approved**: CMS Editor recycle (draft + rejected)

Stakeholder: start implementation. [prds/2026-08-23-cms-editor-recycle.md](./prds/2026-08-23-cms-editor-recycle.md). Editors recycle own draft/rejected; scoped bin + restore. SA only: permanent delete / Empty / Purge. Reviewer unchanged. Clone PR still **wait**.

---

### 2026-08-22 — PRD **Draft**: CMS clone + JSON import/export

[prds/2026-08-22-cms-clone-import-export.md](./prds/2026-08-22-cms-clone-import-export.md). Cut 1 = duplicate to a new draft (all list types; empty media; suffix). JSON import/export later in the same PRD. **Do not implement until Approved.**

---

### 2026-08-22 — CMS list bulk **Delivered** on `main`

Merged `feature/cms-events-publications-bulk` → `main` ([PR #37](https://github.com/hc-medamine/CRSIC-2026/pull/37), `a2c1072`). Events, publications, partners, alerts, laws, platforms, research groups, and research projects share news bulk Unpublish / Recycle (one JSON rebuild per type; no featured prune). Clone / import-export stay deferred.

---

### 2026-08-22 — Implementing CMS remaining-types list bulk

**Branch:** `feature/cms-events-publications-bulk` (same PR as events/publications). **PRD:** [prds/2026-08-22-cms-remaining-types-bulk-actions.md](./prds/2026-08-22-cms-remaining-types-bulk-actions.md) **Approved**. Partners, alerts, laws, platforms, research groups, and research projects get the news bulk Unpublish / Recycle flow; no featured-playlist prune; one JSON rebuild per type batch. Clone / import-export stay deferred.

---

### 2026-08-22 — PRD **Approved**: CMS remaining-types list bulk

Stakeholder: treat [prds/2026-08-22-cms-remaining-types-bulk-actions.md](./prds/2026-08-22-cms-remaining-types-bulk-actions.md) as **Approved**. Copy news gates; no playlist prune.

---

### 2026-08-22 — Implementing CMS events + publications list bulk

**Branch:** `feature/cms-events-publications-bulk`. **PRD:** [prds/2026-08-22-cms-events-publications-bulk-actions.md](./prds/2026-08-22-cms-events-publications-bulk-actions.md) **Approved**. Same news bulk flow on `/dashboard/events` and `/dashboard/publications`; no featured-playlist prune. Remaining types ride the same branch. Clone / import-export stay deferred.

---

### 2026-08-22 — PRD **Approved**: CMS events + publications list bulk

Stakeholder approved [prds/2026-08-22-cms-events-publications-bulk-actions.md](./prds/2026-08-22-cms-events-publications-bulk-actions.md). Copy news gates verbatim; featured-playlist prune is news-only.

---

### 2026-08-22 — PRD **Draft**: CMS events + publications list bulk

[prds/2026-08-22-cms-events-publications-bulk-actions.md](./prds/2026-08-22-cms-events-publications-bulk-actions.md). Copy news bulk Unpublish / Recycle onto both lists; same gates; no featured-playlist prune. **Do not implement until Approved.**

---

### 2026-08-22 — Implementing CMS news list bulk unpublish / recycle

**Branch:** `feature/cms-news-bulk-actions`. **PRD:** [prds/2026-08-22-cms-news-bulk-actions.md](./prds/2026-08-22-cms-news-bulk-actions.md) **Approved**. News list checkboxes (Reviewer + SA); Unpublish; SA recycle of published = unpublish-then-bin in one confirm; skip ineligible + per-item report; one `news.json` rebuild per bulk unpublish. Visual: existing Desk list / checkbox / sticky bar / modal. Clone and import/export stay follow-on PRDs.

---

### 2026-08-22 — PRD **Approved**: CMS news list bulk unpublish / recycle

Stakeholder approved [prds/2026-08-22-cms-news-bulk-actions.md](./prds/2026-08-22-cms-news-bulk-actions.md). Keep today’s gates; no extra four-eyes; skip + report; Desk-native visuals (select → bar → confirm → report → dismiss).

---

### 2026-08-22 — Scheduled publish **cancelled** (removed from backlog)

Stakeholder: skip and **delete** the idea. Confirms 2026-07-21 lock: manual Approve → Publish only; no `scheduled` status, cron, or schedule UI. Do **not** re-list it as deferred. Next remaining deferred item: **bulk ops / clone / import-export** (own PRD first).

---

### 2026-08-22 — CMS Recycle bin **Delivered** on `main`

Merged `feature/cms-recycle-bin` → `main` ([PR #34](https://github.com/hc-medamine/CRSIC-2026/pull/34), `643dbaf`). **PRD:** [prds/2026-08-22-cms-recycle-bin.md](./prds/2026-08-22-cms-recycle-bin.md). SA Move to bin (unpublished/rejected); restore → draft; permanent delete + unused media; 90-day banner/Purge on bin open (no cron). Migration `031`. After pull: `cd cms && npm run db:migrate`.

---

### 2026-08-22 — Implementing CMS Recycle bin

**Branch:** `feature/cms-recycle-bin`. **PRD:** [prds/2026-08-22-cms-recycle-bin.md](./prds/2026-08-22-cms-recycle-bin.md) **Approved**. SA Move to bin (unpublished/rejected, all hard-delete types); restore → draft; permanent delete + Empty bin; 90-day banner/Purge on bin open (no cron). Migration `031`. After pull: `cd cms && npm run db:migrate` (or `npm run dev`). Smoke: [qa/SMOKE-CMS.md](./qa/SMOKE-CMS.md) Rb1–Rb6.

---

### 2026-08-22 — PRD **Approved**: CMS Recycle bin

**PRD:** [prds/2026-08-22-cms-recycle-bin.md](./prds/2026-08-22-cms-recycle-bin.md) — **Approved**. Soft-delete recycle bin.

---

### 2026-08-22 — CMS list Load more **Delivered** on `main`

Merged `feature/cms-list-load-more` → `main`. **PRD:** [prds/2026-08-22-cms-list-load-more.md](./prds/2026-08-22-cms-list-load-more.md). News / events / publications Desk lists: page size 20, `GET /api/news?page=`, Load more appends, `?page=3` paints pages 1–3. No SPA. Next deferred item: **soft-delete recycle bin** (own PRD first).

---

### 2026-08-22 — PRD **Approved**: CMS list Load more

**PRD:** [prds/2026-08-22-cms-list-load-more.md](./prds/2026-08-22-cms-list-load-more.md) — **Approved**. Desk Load more on news / events / publications only. Recycle bin and the rest stay deferred.

---

### 2026-08-22 — Align authorship **Delivered** on `main`

Merged `feature/cms-align-authorship` → `main`. **PRD:** [prds/2026-08-22-cms-reassign-authorship-ui.md](./prds/2026-08-22-cms-reassign-authorship-ui.md). One **Desks** page (`/dashboard/editors`): claims + Align dry-run/Apply; `publisher_id`; JSON rebuild + notifies; rebuild status badge. Migration `030`. After pull: `cd cms && npm run db:migrate` (or `npm run dev`). Next deferred item: **server list pagination** (own PRD first).

---

### 2026-08-22 — PRD **Approved**: CMS Align authorship UI

**PRD:** [prds/2026-08-22-cms-reassign-authorship-ui.md](./prds/2026-08-22-cms-reassign-authorship-ui.md) — **Approved**. Desk Align-to-claims (SA + Reviewer, R1 org scope), assignable scoped publisher on news/events (F1 Boufatah fallback), JSON rebuild + in-CMS notifies, rebuild status badge. Implements deferred backlog **#1**. Do not start remaining deferred items without their own PRDs.

---

### 2026-08-21 — CMS Desk interiors I2 (forms, admin, login)

**Branch:** `feature/cms-desk-interiors-i2` (PRD [prds/2026-08-20-cms-desk-interiors.md](./prds/2026-08-20-cms-desk-interiors.md)). Visual only: shared form kit + `EditPageShell` on all create/edit types, director, featured playlist, profile; admin pages (media/users/orgs/editors/audit/notifications) use Desk headers + “showing N” honesty on capped fetches; login uses Desk ambient with bubbles under the card; preview chrome localized. Bugfix: law/platform restore + reassign now hit `/api/laws` and `/api/platforms` (they previously fell through to alerts). No migrations. Walkthrough still required before merge.

---

### 2026-08-21 — `main` is the live SSOT (cutover merge)

Merged `feature/wordpress-cms-spa-cutover` → `main` (`b1c022c`) and pushed. A clone of `main` now has:

- WordPress-owned-type cutover public JSON + `img/cms/` binaries
- News/event bylines; Home Center News 3-card pager; Home featured **news** playlist (`data/featured-news.json`, CMS `/dashboard/featured-news`, SQL `029`)
- Inventory: **39** news, **55** events, **36** pubs, **17** partners, **350** locale keys

Docs refreshed to match. After clone: `cd cms && npm run db:migrate` (or `npm run dev`). Featured playlist live ids are still **empty** until Reviewer/SA publish — SPA fallback is 3 newest news.

---

### 2026-08-21 — Home featured news playlist (max 10)

Approved PRD: [prds/2026-08-21-home-featured-news-playlist.md](./prds/2026-08-21-home-featured-news-playlist.md). `#home-feat-carousel` is a CMS-curated news playlist (≤10), four-eyes on the playlist, empty live → 3 newest news. Upcoming events teaser unchanged. Desk: `/dashboard/featured-news`. Run `cms` `db:migrate` (`029_site_featured_news.sql`).

---

### 2026-08-21 — Home news carousel: 3 cards per page

Stakeholder: Home **أخبار المركز** is one row of 3 (not 6). 39 items → 13 pages. [prds/2026-08-21-home-news-carousel.md](./prds/2026-08-21-home-news-carousel.md).

---

### 2026-08-21 — Home news carousel: instant resume + opening fade

Stakeholder: no delay after leaving a card; first page change is an immediate fade once Center News is on screen so visitors see the carousel, then 5s dwell. [prds/2026-08-21-home-news-carousel.md](./prds/2026-08-21-home-news-carousel.md).

---

### 2026-08-21 — Home news carousel: faster dwell, card-only hover, no stretch

Stakeholder tweak on the approved PRD: autoplay starts immediately (no 3s idle), dwell **5s**, hover-pause only on cards (gaps keep rotating), last page keeps natural card height. [prds/2026-08-21-home-news-carousel.md](./prds/2026-08-21-home-news-carousel.md).

---

### 2026-08-21 — Home news carousel

PRD [2026-08-21-home-news-carousel.md](./prds/2026-08-21-home-news-carousel.md) **Approved**. Home **أخبار المركز** pages through the full `news.json` list (6 per page, 7s dwell, loop) with header pause/play, swipe, and keyboard arrows. `#news` listing unchanged.

---

### 2026-08-21 — PRD Draft: Home news carousel

Locked decision: Home **أخبار المركز** pages through the full news list (6 per page, 7s dwell, loop). Pause/play in the header; swipe + keyboard; no dots/arrows. `#news` unchanged. Draft: [prds/2026-08-21-home-news-carousel.md](./prds/2026-08-21-home-news-carousel.md). No implementation until **Approved**.

---

### 2026-08-21 — Publication covers belong to the publication Editor

All `covers` media rows (73, previously Super Admin) now `uploaded_by` the Editor who claims publications (currently Medjelled). `npm run db:reassign:to-claims -- --apply` moves cover ownership with desk changes. New legacy `img/covers/` registrations use that Editor, not whoever opened the library.

---

### 2026-08-21 — Editors/reviewers get the media library (with replace seatbelt)

`/dashboard/media` is no longer Super Admin-only. Editors see their own uploads in folders that match their content scopes; reviewers see files in their scopes but can only replace/delete what they uploaded. Replacing a file that is on a published page (or a live public copy) asks for confirmation first — same URL, public site updates immediately. Delete-when-in-use is unchanged.

---

### 2026-08-21 — Align authorship with live editor desks

Live CMS scopes are the desk SSOT (staff will re-check later). Seed + cutover map now match: Megoussi news/event/law/partner; Medjelled publication/platform; Djefal all four research depts; Derrafa alert. Reassigned 36 publications, 3 laws, and 4 east research groups so Editors can open their own items. Ops: `cd cms && npm run db:reassign:to-claims -- --apply`.

---

### 2026-08-21 — Byline: collapse identical reviewer + publisher

When المراجعة and النشر are the same person, the SPA shows one line (**المراجعة والنشر** / **Reviewer & Publisher**) instead of repeating the name.

---

### 2026-08-21 — News list search/year filter + card byline

`#page-news` has a search box and year chips (same toolbar pattern as publications). Approved byline PRD: news/event cards and details show date (news) plus التحرير / المراجعة / النشر. Publisher is always فريحة بوفاتح / Fariha Boufatah. Backfill: `cd cms && npm run db:backfill:bylines -- --apply`.

---

### 2026-08-21 — News list page (`#news`)

Home “Center News / View all” pointed at `#home-news-grid`, which the router treated as a missing page. It now opens `#page-news` with the full news grid. `#home-news-grid` aliases to `#news`.

---

### 2026-08-21 — News/event card byline PRD **Approved**

**PRD:** [prds/2026-08-21-spa-news-event-card-byline.md](./prds/2026-08-21-spa-news-event-card-byline.md) — status **Approved**.

**Locked for draft:** news + event cards (Home + lists, details should match); news date = WP article date if imported else CMS `published_at`, list sorted by that date; events keep occurrence day/month/year; التحرير/المراجعة from CMS names; النشر always Boufatah.

---

### 2026-08-21 — WordPress cutover `--apply`

**PRD:** [prds/2026-08-21-wordpress-cms-spa-cutover.md](./prds/2026-08-21-wordpress-cms-spa-cutover.md).

Applied 98/100 planned rows (author = scoped editor, publisher = Boufatah). Public JSON rebuilt. Two platform payloads failed on empty WP media then were repaired by keeping existing `img/cms/platforms` files. Publications/laws unchanged (no WP listing). DB dump: `tmp/crsic_db-pre-wp-cutover-*.dump`. JSON copy under `tmp/wp-cutover-*/json/`.

---

### 2026-08-21 — WordPress cutover script (dry-run first)

**PRD:** [prds/2026-08-21-wordpress-cms-spa-cutover.md](./prds/2026-08-21-wordpress-cms-spa-cutover.md) (Approved).

Ops CLI: `cd cms && npm run db:cutover:wordpress` scrapes known WP hubs on `crsic.dz`, matches type+title/slug, writes `tmp/wp-cutover-report.json`. `--apply` only after sign-off (author = scoped editor, publisher = Boufatah). Publication JSON may now carry an empty cover string when WP has no image (SPA omits `img` src).

---

### 2026-08-21 — WordPress → CMS/SPA cutover PRD **Approved**

**PRD:** [prds/2026-08-21-wordpress-cms-spa-cutover.md](./prds/2026-08-21-wordpress-cms-spa-cutover.md) — status **Approved**.

**Locked:** scrape CMS-owned types on `crsic.dz`; match type+title/slug update-in-place or insert; recover media or leave empty; author = scoped editor; publisher = Boufatah; overwrite live JSON after dry-run sign-off. Journals/OJS and static pages out of this slice.

---

### 2026-08-21 — SPA consumes CMS item media; published `img/cms/` is tracked

**Why:** Publication cards were reading the parallel `covers[i]` array instead of each CMS-published item’s `media[]`, so a cover that existed on disk (`img/covers/i05.jpg`) did not show for *مقالات في اللغة والفقه والإعجاز القرآني* (published path `img/cms/covers/…`). `img/cms/**` was gitignored, so clones lost published binaries.

**SPA:** Cards and details prefer CMS item fields (`media[]`, then `img` / `cover` / `og_image`). Publication cards use `coverSrcFromPub`.

**Git:** Root `.gitignore` no longer ignores `img/cms/**`. Staging stays `cms/uploads/**`. New CMS cover uploads go to `img/cms/covers/` (`publicPathFor`).

**Cutover:** `npm run db:migrate:media-to-cms` copied every CMS-managed image into `img/cms/{bucket}/`, registered `media_assets`, rewrote `live_payload`, and rebuilt public JSON. Partner photos were re-fetched from crsic.dz (9/11; CRASC and the multi-university agreement have no matching WP post, so they stay emoji-only until uploaded in CMS).

**Cover remap:** SPA was showing mixed covers because `covers[]` was filename-ordered, not title-matched (journal issues and other books sat on the wrong titles). Covers were reassigned by reading the title on each image. JSON fetch now uses `cache: 'no-store'` so CMS remaps show on the next load.

---

### 2026-08-20 — Local CMS staff table + seed includes all four editors

**Docs / seed:** `cms/README.md` staff table, `cms/.env.example` login-bubble emails, and `cms/scripts/seed-staff.ts` (`npm run db:seed:staff`) now list all four editors: `i.megoussi`, `t.medjelled`, `a.djefal`, `a.derrafa`. Super Admin + Reviewer unchanged.

---

### 2026-08-20 — CMS Desk interiors PRD **Approved**; I1 lists in progress

**PRD:** [prds/2026-08-20-cms-desk-interiors.md](./prds/2026-08-20-cms-desk-interiors.md) — status **Approved**.

**Branch:** `feature/cms-desk-interiors` — I1 (lists) implemented, pending walkthrough; I2 after stakeholder validation.

**I1 done:**
- `ContentListPage` Desk restyle (header card, teaching empty + create CTA, filtered-empty + clear filters, whole-row click, RTL `border-s` accent).
- News / events / publications are thin wrappers around `ContentListPage` + `ContentListFilters` (`?q=` / `?status=` preserved).
- Other `ContentListPage` routes inherit the restyle. `ListSkeleton` header matches. New CMS labels: `emptyFiltered`, `clearFilters`, `emptyCreateHint`.
- Dev login bubbles: on by default in `npm run dev` (hide with `NEXT_PUBLIC_CMS_LOGIN_BUBBLES=0`); dark bottom strip, **not** inside the login card.

**Next:** stakeholder walkthrough (News + Partners, AR + EN) on `cms npm run dev`; then merge I1.

---

### 2026-08-20 — CMS Desk interiors PRD **Draft** (scope locked)

**PRD:** [prds/2026-08-20-cms-desk-interiors.md](./prds/2026-08-20-cms-desk-interiors.md) — status **Draft**. **Superseded:** Approved same day (entry above).

**Locked:** lists + forms + admin pages; login yes; phases **I1 then I2**; unify news/events/publications onto `ContentListPage`; visual only; zero new deps; media “showing N” (no pager); public SPA out.

**Blind spots folded in:** filtered-empty vs inventory-empty; do not add filters to other types; editors in I2; login visual only; Home/shell out.

**Files:** `docs/prds/2026-08-20-cms-desk-interiors.md`, `docs/prds/README.md`, `README.md`, `docs/WORKLOG.md`

**Next:** stakeholder marks PRD **Approved** → implement I1 on `feature/cms-desk-interiors` (lists only). No code before Approved.

---

### 2026-08-20 — CMS Desk marked **Delivered**; interiors follow-on started (idea)

**Done (docs chore, no code):**
- [PRD `2026-08-19-cms-desk-design.md`](./prds/2026-08-19-cms-desk-design.md) status **Delivered**; index + README §10/§11 synced to merge `25b15cc`.
- Orphan untracked cover `img/covers/fa99c136a4874d85b98426d2bdf9e07e.png` removed (not referenced).
- Next product slice captured as **CMS Desk interiors** (list / edit / detail pages) — PRD-first; no implementation until Approved.

**Files:** `docs/prds/2026-08-19-cms-desk-design.md`, `docs/prds/README.md`, `README.md`, `docs/WORKLOG.md`

**Next:** lock interiors scope with stakeholder, then Draft PRD. **Superseded:** lock + Draft PRD same day (entry above).

---

### 2026-08-20 — Server run + debug capture + production speed pass

**Servers run:** SPA :5500 (`npx serve`, detached, log captured) + CMS :3000 (`next start` **production build**, detached, log captured).

**Debug findings (captured from logs + probes):**
- SPA missing `favicon.ico` → browser auto-request 404s on every load. Fixed by adding `<link rel="icon" type="image/png" href="img/nav-crsic-logo.png">` to `index.html` head.
- CMS `/dashboard` unauthenticated → correct 307 → `/login` (throw `UNAUTHENTICATED` → catch → redirect pattern in `dashboard/layout.tsx`); the logged `Error: UNAUTHENTICATED` is expected noise from that pattern.
- CMS build warning (pre-existing, benign): Turbopack NFT "whole project traced" on `src/app/api/media/file/route.ts` (runtime `path.join` over `img/`); works fine at runtime.
- SPA `serve` already sends brotli/gzip (`Content-Encoding: br`) + ETags.

**Speed/production improvements applied:**
- CMS now runs a **production build** (`next build` + `next start`) instead of dev Turbopack — Ready in 421ms, warm `/login` ≈ 42–63ms, full route tree compiled.
- Added `serve.json` cache headers for the SPA: images/video `public, max-age=2592000, immutable`, JS/CSS `public, max-age=86400`, `data/*.json` `public, max-age=3600`.
- Warm response times verified: CMS `/login` 42ms (cold 108ms), SPA `/` 43ms.

**Files:** `index.html`, `serve.json`, `docs/WORKLOG.md`

**Verified:** SPA tests 7/7; no 404s in fresh SPA log; cache headers confirmed on assets.

---

### 2026-08-19 — CMS Desk: shell + dashboard home implemented

**Done:**
- `CmsChrome` shell redesign (novice-first navigation, section chrome, onboarding placement).
- Dashboard home: quick-stats row (content totals, **English pending** counter), onboarding banner (session-scoped toggleable show/hide hint — never permanently dismissed), animated **Content by editor** stats table.
- Stats table is role-aware: **Editor** sees own authored rows; **Reviewer** sees editors + reviewers in their org scope (Super Admin excluded); **Super Admin** sees all active users.
- Author-origin statuses: editors' `published` items count as **Approved** (they author, they don't publish); the **Published** column reflects the publishing role via `audit_log` (`*.publish|emergency_publish`, distinct per actor). Unpublished column dropped.
- Zero-item users appear (users-first `LEFT JOIN`); color-coded status dots/badges, stagger-on-enter + hover animations, `prefers-reduced-motion` respected.

**Files:** `cms/src/app/dashboard/{cms-chrome,home-onboarding,page,ui-bits}.tsx`, `cms/src/app/globals.css`, `cms/src/lib/content/queues.ts`, `cms/src/lib/i18n/labels.ts`, `docs/WORKLOG.md`

**Verified:** CMS `tsc` clean, CMS tests 18/18, SPA tests 7/7, CMS lint at pre-existing baseline (9 problems in untouched files), live-DB queries for all three roles.

**Merged:** `25b15cc` on `main` (local merge of `feature/cms-desk-design`, 2026-08-19). List/detail/edit interiors were out of scope — follow-on slice, not this PRD.

---

### 2026-08-19 — CMS Desk: shell + dashboard redesign PRD **Approved**

**Done:**
- PRD-first workflow steps 1–8 for the CMS visual redesign slice: idea captured (CMS not attractive/intuitive; novice users first-class) → scope locked → [PRD `docs/prds/2026-08-19-cms-desk-design.md`](./prds/2026-08-19-cms-desk-design.md) **Approved**.
- Locked decisions: distinct "CMS Desk" identity (option B), shell-wide scope, zero-dependency default, manual stakeholder walkthrough per merge, OS `prefers-reduced-motion`-only motion gate (no calm-mode toggle), dashboard quick-stats row, all nice-to-haves validated, SaaS-dashboard reference.
- `AGENTS.md` tightened (agent-critical gotchas only; `--env-file=.env.local` hard-fail, smoke gate before merge, PRD-first default).

**Files:** `docs/prds/2026-08-19-cms-desk-design.md`, `docs/prds/README.md`, `docs/WORKLOG.md`, `AGENTS.md`

**Next:** implement on `feature/cms-desk-design` — shell (`CmsChrome`) then dashboard home; validated merges only.

---

### 2026-08-19 — Server execution analysis + lint fixes

**Servers run:** SPA :5500 (`npx serve`) + CMS :3000 (`next dev`, Turbopack) — both detached, logs captured, both serving cleanly.

**Runtime probe results (no regressions):**
- SPA — all assets 200 (`/`, css, motion.css, js modules, JSON, img); hero videos `preload="auto"`; all relative JS imports resolve; all referenced covers/Holders/event imgs exist on disk; locale keys 333/333 in sync; 244 `data-i18n` keys used in HTML all present; router page ids all present in HTML (`page-fade-in` is a CSS class, not a route); `covers.length === pubs.length` (36/36); all `data/*.json` valid.
- CMS — migrations all applied (28/28 skip), Ready in 502ms, **no** "Slow filesystem" warning; `/api/health/db` 200 `{ok:true}`; auth flow correct (`/`→307 `/login`, `/dashboard`→307, `/api/auth/me` 401, content APIs 401, audit/org-units 403 role-gated, invalid preview token 404); Turbopack hot-reload clean after edits.
- Tests: SPA 7/7, CMS 18/18. No stray `console.log` in either codebase.

**Fixed (PR #29, `85ba19a`):**
- `cms/src/app/api/org-units/route.ts` — 3 unused imports (`deleteOrgUnit`, `getOrgUnitDeleteImpact`, `updateOrgUnit`) removed.
- `cms/src/lib/publish/slug.ts` — `prefer-const` in `uniqueSlug`.

**Tracked (pre-existing, not regressions):** 8 lint problems remain — 6 `react-hooks/set-state-in-effect` errors + 2 `exhaustive-deps` warnings in `away-panel`, `comment-thread`, `home-tip-banner`, `spa-preview-link`, `review-owner-panel`, `revision-history` (async data-fetch `load()` patterns; setState occurs after `await`, not synchronously — rule flags the call itself). One dev-log noise item: `UNAUTHENTICATED` throw in `session.ts:79` prints a stack trace per unauthenticated dashboard hit, though the layout catches it and 307-redirects correctly (cosmetic, dev-only).

---

### 2026-08-19 — Motion & interactivity polish: **all merged** + environment cleanup + docs refresh

**PRD:** [prds/2026-08-18-motion-interactivity-polish.md](./prds/2026-08-18-motion-interactivity-polish.md) — status **Delivered**

**Merged to `main` (`df4b2d4`):**
- M1 (PR #24) → M2 (PR #25) → M3 (PR #26) → M4 (PR #27) — phase-by-phase, each stakeholder-validated on local serve.
- Docs PR #22 (branch-only rule) + PR #23 (this PRD, rebased onto `main` after a `docs/WORKLOG.md` merge conflict — Approved entry placed chronologically above the Draft entry).
- All 7 open PRs closed; `origin/main` = `HEAD` (0 ahead / 0 behind).

**Environment cleanup:**
- All servers stopped (SPA :5500, CMS :3000; `Get-Process node` empty).
- Caches removed: `cms/.next` (682 MB), no `.turbo` / `node_modules/.cache` present.
- Junk removed: temp server logs + scratch `motion-prd.md` (Temp\opencode), stale git locks (none), `data/*.json` `.bak`/`.smoke-snap` artifacts.

**Docs refreshed for current state:**
- `README.md` — §3 tree (+ `css/motion.css`, `img/Hero/*.mp4` git-lfs), §6.3 motion-layer bullet, §6.5 hero video assets, §10 roadmap (step 4 nav-ux **Done**, step 5 motion **Done**, tech-debt row removed), §11 last-updated.
- PRD — status **Delivered**, decision-log row, all §12 backlog boxes checked (incl. nice-to-haves).
- `docs/prds/README.md` — index row updated to **Delivered**.

---

### 2026-08-19 — Motion M4: deviation fixes + PRD nice-to-haves

**PRD:** [prds/2026-08-18-motion-interactivity-polish.md](./prds/2026-08-18-motion-interactivity-polish.md) (Approved) — **stakeholder validated M1–M4**

**Branch:** `feature/motion-m4` (PR #27)

**Done (final pass):**
- **Row-enter parity:** `cms-row-enter` stagger applied to the hand-rolled tables/lists that bypassed `ContentListPage` — news, events, publications, notifications, audit, org-units (PRD §4.11).
- **Sticky action bar scroll shadow (fix PRD §4.18):** `FormStickyActions` now casts its shadow only when content scrolls beneath the pinned bar — sentinel + rAF-throttled rect check; `transition-[box-shadow]` guarded by the reduced-motion rule.
- **Hero encodes committed:** web-optimized H.264 1080p30 re-encodes replace the 260MB/331MB LFS blobs (15MB/24MB) so the M3 instant-video fix propagates; unreferenced cover png (resurrected by the earlier stash-pop) deleted.
- **Nice-to-have — lightbox swipe:** touch drag-follow + snap-to-adjacent-publication navigation in `js/ui.js` (`initLightboxSwipe`, 50px threshold); reduced-motion keeps navigation but skips the drag transform.
- **Nice-to-have — gentle float:** director portrait floats after its staged entrance; partner logo medallions get a 6s float (`partnerMarkFloat`, `directorFloat`).
- **Nice-to-have — empty-state pulse:** `.cms-empty-state` 55%→100% opacity 3.2s loop on shared ContentListPage, ui-bits queue, news/events/publications/audit/notifications.
- **Verification:** SPA tests 7/7, CMS tests 18/18, eslint clean on all touched files, `ui.js` parses, both servers serving updated code.

### 2026-08-18 — Motion M4: CMS daily-flow polish

**PRD:** [prds/2026-08-18-motion-interactivity-polish.md](./prds/2026-08-18-motion-interactivity-polish.md) (Approved)

**Branch:** `feature/motion-m4` — **not merged until M1–M4 all pass** (hard rule)

**Done:**
- **Publish button state machine (M4.1):** new `PublishButton` in `cms/src/app/dashboard/form-ux.tsx` — idle → spinner (border-rotating ring) → gold `cms-check-pop` (spring scale-in, 420ms, auto-resets after 1.6s). Swapped into all 10 publish buttons (alert/event/law/news/platform/group/partner/publication/project/director forms). Uses the React-sanctioned "adjust state when props change" render pattern (no setState in effect).
- **Sidebar active pill + collapsible groups (M4.2):** `cms-chrome.tsx` — active nav link gets `cms-nav-active` springy pill pop; `GroupLabel` replaced with `NavGroup` (Centre content / Research / Admin) — chevron toggles a `grid-template-rows 1fr↔0fr` height transition (RTL-aware rotation). `NavLink` hoisted out of render (fixes `react-hooks/static-components`).
- **Modal spring-in + backdrop blur (M4.3):** `cms-modal-backdrop` (fade + blur(4px)) and `cms-modal-panel` (translateY 14px + scale 0.96 → spring-in 320ms) applied to media lightbox + media delete/blocked dialogs.
- **List skeletons (M4.4):** shared `ListSkeleton` (`cms/src/app/dashboard/list-skeleton.tsx`) + `loading.tsx` added to all 10 content-list routes (news/publications/events/partners/laws/platforms/alerts/research-groups/research-projects/media) — shimmer mirrors the SPA `.skeleton` pattern (`.cms-skeleton`, gold-green gradient sweep).
- **CSS:** keyframes/classes appended to `cms/src/app/globals.css` under the M4 banner; all collapse under the existing `prefers-reduced-motion` guard.
- **Verification:** `cms npm test` 18/18 pass; `npx eslint` clean on all touched files (remaining repo errors are pre-existing on base — `away-panel`, `comment-thread`, `home-tip-banner`, `spa-preview-link`, `review-owner-panel`, `revision-history`, `slug.ts`); `/login` 200, `/dashboard` 307 (auth) on :3000.

### 2026-08-18 — Motion M3: SPA exploration & micro-interactions

**PRD:** [prds/2026-08-18-motion-interactivity-polish.md](./prds/2026-08-18-motion-interactivity-polish.md) (Approved — docs branch PR #23)

**Branch:** `feature/motion-m3` (PR #26) — **not merged until M1–M4 all pass** (hard rule)

**Done:**
- **FLIP publications filter:** `js/ui.js` `applyPubFilter` now keeps already-visible cards in place (only newly-shown cards fade/scale in) and runs `flipPubCards()` after the hide collapse — surviving cards animate `translate(dx,dy)` from their old grid slot to the new one (transform-only, reduced-motion skipped).
- **Hero floaters:** three gold orbs (`.hero-float--a/b/c`) drift behind the home headline — vertical drift + scale + opacity (floor 0.12, never fully hidden), direction-agnostic, `aria-hidden`. ID-scoped (`#page-home .hero-floaters`) to beat the `style.css` A5 rule (`.hero-main > *` → `position:relative`), and deliberately **no width breakpoint** — the original `≤768px` `display:none` hid them in any narrow/zoomed window.
- **Headline word reveal:** `initHeroWordReveal()` wraps the home h1 phrase + gold `<em>` **and the About page-hero h1** in masked `.wr-word`/`.wr-inner` spans with a per-word stagger (`--wr-d`); **only the active page's h1 is revealed, and the router replays the reveal on every navigation** (`replayActiveHeroWords()` runs inside the view-transition swap callback, snapping words under the mask first so re-visits replay instead of no-op). Re-wraps idempotently after lang toggles via `refreshMotionReveals`. Reduced-motion = plain text.
- **Page-hero entrance (shake fix):** `.page.active .page-hero` and non-home `.hero-main` now fade in **opacity-only** instead of `pageStagger`'s translateY slide — a fractional-pixel container slide re-rasterizes text every frame (subpixel jitter/"shaking" on scaled Windows displays), while home (whose hero children animate, not the container) never shook.
- **Heading gradient pan:** delivered as a transform-only one-shot gold sheen across `.section-title.drawn` underlines (`--sheen-from/to` mirrored for RTL). A `background-clip:text` gradient on the hero `<em>` was tried and **dropped** — text-clip breaks when descendants are composited (opacity/transform), rendering the gold text invisible during the word reveal.
- **Hero video startup:** both hero videos (`hero-bg.mp4`, `about-hero-bg.mp4`) were `preload="metadata"` **and** non-faststart (260/331 MB with the `moov` metadata atom at the file tail), so playback lagged ~1s behind load, coinciding with the word reveal. Fixed with `preload="auto"` and an ffmpeg `-movflags +faststart -c copy` remux (metadata to front, no re-encode; files are git-ignored so this is a local asset swap). Video now fetches at ~270ms, independent of the reveal.

**Files:** `js/ui.js`, `js/animations.js`, `css/motion.css`, `index.html`, `img/Hero/*.mp4` (local, git-ignored), `docs/WORKLOG.md`

### 2026-08-18 — Motion M2: SPA navigation cohesion

**PRD:** [prds/2026-08-18-motion-interactivity-polish.md](./prds/2026-08-18-motion-interactivity-polish.md) (Approved — docs branch PR #23)

**Branch:** `feature/motion-m2` (PR #25)

**Done:**
- **View transitions:** `js/router.js` wraps the section swap in `withPageTransition` — `document.startViewTransition` when available, `page-fade-in` class fallback otherwise (skipped entirely under reduced-motion). `css/motion.css` M2 section: `::view-transition-old/new(root)` crossfade + vertical slide (RTL-safe, no mirroring needed), `vtPageOut`/`vtPageIn` keyframes; detail shell gets fade-only (content fills async).
- **Lightbox spring + frosted backdrop:** `backdrop-filter: blur(6px)` on `.lightbox-overlay`, panel entrance `scale(0.92) → 1` with springy `cubic-bezier(0.16,1,0.3,1)` (motion-only).
- **Tab indicator morph:** `.tab-bar::after` upgraded to rounded 3px gold pill + soft glow + springy easing (extends existing `--ind-x`/`--ind-sx` slide).
- **Home pub carousel progress track:** `initPubCarouselTrack()` in `js/animations.js` injects a thin gold thumb track under `#home-pub-grid` (≤768px). Direction-agnostic — active card via centre proximity, thumb mirrored in RTL; click/tap the track to jump pages; re-queries cards so it survives language re-renders; usable (snap-only) under reduced-motion.

**Also fixed this phase:** `cms/src/app/dashboard/director/director-form.tsx` last-published timestamp used locale-dependent `toLocaleString()` → SSR (en-GB) vs browser (en-US) hydration mismatch; now deterministic `YYYY-MM-DD HH:MM` matching other CMS lists.

**Files:** `js/router.js`, `js/animations.js`, `css/motion.css`, `docs/WORKLOG.md`, `cms/src/app/dashboard/director/director-form.tsx`

### 2026-08-18 — Motion & interactivity polish PRD **Approved**

**PRD:** [prds/2026-08-18-motion-interactivity-polish.md](./prds/2026-08-18-motion-interactivity-polish.md)

**Locked (10 Q&A decisions):** showy everywhere; M1 both apps first → M2 → M3 → M4; View Transitions API + fade fallback; all nice-to-haves kept; CMS stagger capped at 12 rows; OS `prefers-reduced-motion` only gate (zero i18n churn); explicit performance budget (§9) gates each merge; phase-by-phase validated merges on local serve (:5500 / :3000).

**Branch-only rule (mandatory, all future work):** never commit to `main` directly; merge only after stakeholder validation — recorded in `AGENTS.md` + README §5.3.

**Status:** **Delivered** — M1–M4 merged phase-by-phase (PRs #24–#27) on 2026-08-19; see top entry.

### 2026-08-18 — Motion & interactivity polish PRD **Draft**

**PRD:** [prds/2026-08-18-motion-interactivity-polish.md](./prds/2026-08-18-motion-interactivity-polish.md)

**Scope:** SPA + CMS motion layer — view transitions, FLIP filter reflow, card micro-interactions, hero floaters/word reveal, CMS list/toast/publish/modal/sidebar/skeleton feedback. No schema/locale/layout changes; transform+opacity only; `prefers-reduced-motion` gate; zero new deps. Delivery M1–M4, each phase independently smokeable.

**Next:** stakeholder Approve → implement per phase on feature branches.

### 2026-08-18 — Tooling + docs hygiene (no runtime change)

**Done:**
- Root `package.json` gains `test` script (`node --test tests/*.test.mjs`); `npm test` now works at root.
- `.gitignore` ignores `data/*.json.tmp` (alongside `.bak`/`.smoke-snap`); fixed stale "no root package.json" comment; removed untracked junk (`data/alerts.json.tmp`, `data/news.json.tmp`, unreferenced `img/covers/fa99c136…png`).
- `README.md` §3 tree + §4.3 inventory refreshed for Phase 3 surface (`alerts/laws/platforms/research-groups/research-projects/director.json`, new `js/` modules, `scripts/`), locale keys ~333.

**Files:** `package.json`, `.gitignore`, `README.md`, `docs/WORKLOG.md`

### 2026-07-27 — Laws/Platforms parity + Director CMS PRD **Approved**

**PRD:** [prds/2026-07-27-laws-platforms-parity-director-cms.md](./prds/2026-07-27-laws-platforms-parity-director-cms.md)

**Locked:** Attachments UI; SPA secondary `externalUrl` (More information / المصدر); seed cutover published+live_payload; Director CMS (SA + centre-wide Reviewer); journals/About body pages OOS.

**Branch:** `feature/laws-platforms-parity-director-cms`

**Implemented:** attachments on law/platform forms; SPA secondary link + parent nav; `028_site_director` + `/dashboard/director` + `data/director.json`; `npm run db:import:laws-platforms` (seed catalog imported).

### 2026-07-27 — Laws/Platforms **native SPA** amendment (Approved)

**PRD:** [prds/2026-07-27-spa-laws-platforms-home.md](./prds/2026-07-27-spa-laws-platforms-home.md)

**Locked correction:** Cards open `#law/{slug}` / `#platform/{slug}` with extracted body (no primary legacy CTA). Layout: restore news/pub/event cover thumbs; drop global 5-up; carousel gutters; catalog ~3–4 cols.

**Branch:** `feature/spa-laws-platforms-home`

### 2026-07-27 — SPA Laws/Platforms/Home PRD **Approved**

**PRD:** [prds/2026-07-27-spa-laws-platforms-home.md](./prds/2026-07-27-spa-laws-platforms-home.md)

**Locked:** Laws & Platforms SPA+CMS; Home carousel (3 events) + reorder; About director placeholder; event `ongoing` badge; 5-up cards + contain; Bahij font.

**Branch:** `feature/spa-laws-platforms-home`

### 2026-07-27 — README stack drift fix (docs)

**Done:** Corrected root README to describe the dual product (public SPA + `cms/`), root `package.json` / `npm run spa`, `PREVIEW_API_BASE`, ports 5500 vs 5501, SPA unit tests, and CMS Node/Postgres setup pointers. Removed outdated claims (no `package.json`, Git not initialised, SPA “no tests”).

**Files:** `README.md`, `docs/WORKLOG.md`

**Next:** (none)

### 2026-07-26 — RTL/LTR ops hardening (SPA + CMS)

**Ops/hardening** (no PRD). Logical CSS sweep on public `css/style.css`; CSS-driven CTA arrows (locale strings de-arrowed); scroll progress mirrors reading direction; contact BiDi isolation; CMS Tajawal + sync `<html lang/dir>` from chrome. QA + authoring guide: [qa/RTL-LTR.md](./qa/RTL-LTR.md). Org chart: **Option A** (flip with language / natural `dir`).

### 2026-07-26 — Feature-completeness audit **closed** (current scope)

**Merged:** PR [#17](https://github.com/hc-medamine/CRSIC-2026/pull/17) on `main` (`b14355e`).

**Closed in scope:** SEO revision restore; partner JSON cutover + detail narrative + legacy enrich; partner people attribution; research restore / media DELETE / comment deeplinks / preview ×7 (prior commits on same PR).

**Local cleanup:** Restored accidental `data/{alerts,events,news,publications,research-*}.json` dirty churn; deleted merged feature branch; on `main`.

#### Deferred backlog (not now — future PRDs)

Remind on CMS/product sessions; do **not** start without stakeholder PRD lock. Ordered **simple → complex**:

| # | Item | Why this rank |
|---|------|----------------|
| 1 | CMS UI to reassign editor/reviewer/publisher | **Delivered** on `main` — [prds/2026-08-22-cms-reassign-authorship-ui.md](./prds/2026-08-22-cms-reassign-authorship-ui.md) |
| 2 | Server list pagination | **Delivered** on `main` — [prds/2026-08-22-cms-list-load-more.md](./prds/2026-08-22-cms-list-load-more.md) (CMS news/events/publications Load more) |
| 3 | Soft-delete recycle bin | **Delivered** on `main` — [prds/2026-08-22-cms-recycle-bin.md](./prds/2026-08-22-cms-recycle-bin.md) (PR #34) |
| — | Scheduled publish | **Cancelled** (2026-07-21, confirmed 2026-08-22). Removed from this list. Manual Approve → Publish only. |
| 4 | Bulk ops / clone / import-export UI | **List bulk** on all CMS content types (news PR #36; events/publications + remaining types PR #37). **Clone Cut 1 Delivered** — [prds/2026-08-22-cms-clone-import-export.md](./prds/2026-08-22-cms-clone-import-export.md) (PR #42). JSON import/export still deferred. |
| 5 | Media crop / optimize / variants | Imaging pipeline + extra storage |
| 6 | EN editorial body parity | Schema + forms + SPA across types — see [audits/PARITY.md](./audits/PARITY.md) |
| 7 | Static institutional pages in CMS | New types + SPA routes; locales only today |
| 8 | Journals in CMS | Replace OJS; largest product change |

---

### 2026-07-26 — Partner detail narrative PRD **Approved**

**PRD:** [prds/2026-07-26-partner-detail-narrative.md](./prds/2026-07-26-partner-detail-narrative.md)  
**Locks:** A3 summary+body; B2 AR+EN; C1 legacy scrape→CMS; D3 hero+summary+expandable body; E2 card teaser; F1 enrich ×11; G1–G12.

**Impl order:** CMS field wiring → publish/preview → SPA card/detail → scrape enrich → smoke.

---

### 2026-07-26 — CMS/SPA parity PRD **Approved**

**PRD:** [prds/2026-07-26-cms-spa-parity-preview-media.md](./prds/2026-07-26-cms-spa-parity-preview-media.md)  
**Memo lock:** Q3=B (partner + research-group SPA detail), Q1=B (preview ×4), Q2=A (emergency stays 3-type), Q4=B (buckets `partners` / `research` / `alerts`).

**Impl order:** media buckets → SPA detail routes → preview extension → smoke docs. Emergency unchanged.

---

### 2026-07-26 — Public SPA Themes **dropped**

**Decision (stakeholder):** Completely drop the Public SPA Themes product idea. No Themes PRD, no catalog, no CMS theme switcher for the public site.

**Was:** Deferred after CMS Direction B (SA-only; Default+A/B/C; preview; rollback) — see cancelled §8 in Direction B PRD.

**Out of scope going forward:** Runtime public theme switching, theme catalog, theme preview/live apply from CMS.

**Still true:** Public SPA keeps its current single visual system; CMS stays on Direction B only.

---

### 2026-07-23 — CMS Direction B **Accepted** (stakeholder) → ship then pause

**Branch:** `feature/cms-direction-b-visual`  
**Stakeholder:** Accepted Direction B visual + polish in chat (2026-07-23).

**Shipped on branch (beyond initial B chrome)**
- Home create-content dropdown by scopes; equal queue card grid; pinned sidebar footer
- Success/error toasts (top, auto-dismiss)
- FormSection + sticky actions on all content types; Events/Publications list search+status filters
- In-CMS A1 preview (`/dashboard/preview/{token}`); media file API serves `img/cms/*` + legacy `img/covers/*`
- Public SPA `PREVIEW_API_BASE` → CMS; root `npm run spa` (port 5500)
- Ops scripts: legacy authorship reassign + publisher attribution to F. Boufatah (local DB)

**Pause:** Was “Themes next Sunday.” **Superseded 2026-07-26:** Public Themes **dropped** entirely (see entry above).

---

### 2026-07-23 — CMS Direction B visual + Themes decisions (branch / rollback)

**Branch:** `feature/cms-direction-b-visual`  
**Stable rollback tag:** `stable/pre-cms-b-visual` (points at pre–Direction B baseline including login-bubbles commit on `main`)

**Locked**
- CMS visual = Direction B (Soft modernize); implement after PRD **Approved**
- Public Themes = next PRD: SA-only; catalog Default+A/B/C (+ custom JSON later); preview before live; full look (layout/nav/hero); instant rollback to Current; visitors see theme on reload/instant; theme names AR/EN
- Ship order = CMS B first → Themes PRD after

**PRD:** [2026-07-23-cms-direction-b-visual.md](./prds/2026-07-23-cms-direction-b-visual.md) (**Approved** 2026-07-23)

**Implementation (on branch)**
- Tokens in `cms/src/app/globals.css` (`crs-*`) + `.cms-form` control styling
- Sidebar chrome (`cms-chrome.tsx`), login, Home 3-column queues
- Shared: `ContentListPage`, `EditPageShell`, `form-ux` (numbered sections + sticky actions), drag-drop media upload
- All content lists on table pattern; admin/utility pages use breadcrumbs + large titles
- Primary/secondary CTAs, soft `rounded-2xl` surfaces, ≥44px actions
- Shared class helpers: `cms/src/lib/cms-ui.ts`

---

### 2026-07-23 — CMS UX follow-up polish (density / tip / nav)

**Branch:** `feature/cms-ux-m1-nav-home`

- Home: hide empty secondary queues; quieter EN-pending / overview cards; EN CTA when backlog exists
- Nav: content on row 1, Media/Notifications/Profile + Admin on row 2; stronger group labels
- Tip: session dismiss + “Show tip” restore (not forever)

**PRD:** [2026-07-23-cms-navigation-authoring-ux.md](./prds/2026-07-23-cms-navigation-authoring-ux.md)

---

### 2026-07-23 — CMS UX M1–M3 implementation (nav, Home, forms)

**Branch:** `feature/cms-ux-m1-nav-home`

**Done:**
- Role-grouped chrome (Centre content / Research / Admin separated); mobile menu
- Home cockpit: primary CTAs, tip banner, clearer empty states; Reviewer inbox prioritized
- Progressive disclosure on content forms (EN/SEO under Advanced); FormBanner success/error
- Back links → Home; delete returns to Home; Media nav for Editor/Reviewer/SA
- Home polish: EN-pending / recently-published caps; no duplicate Create news CTA; restored rejected/unpublished queues

**UI recheck (SA session):** See chat findings — group labels subtle; SA Home still dense with empty queues; Advanced disclosure works on news form.

**PRD:** [2026-07-23-cms-navigation-authoring-ux.md](./prds/2026-07-23-cms-navigation-authoring-ux.md)

---

### 2026-07-23 — CMS navigation & authoring UX (decision lock → PRD Review)

**Decision summary (locked for PRD):**

- Pain: all (nav scatter, round-trips, role confusion, heavy forms). Scope: **wide**.
- Delivery: **phased** — M1 nav + Home cockpit → M2 forms → M3 empty/error/success + tips (not big-bang).
- IA: role-grouped chrome; Centre content vs Research; hide empty groups; SA **Admin** separated.
- Home = “what next” cockpit; keep delegation / post-review queues for Reviewer/SA.
- URLs stay (`/dashboard/news`, …); chrome + Home first.
- Forms: AR-first progressive disclosure; checklist mandatory; preview/SEO/rich body/EN preserved.
- Out of scope: public SPA redesign, new types, email, RBAC rule changes, full brand rethink.

**PRD:** [docs/prds/2026-07-23-cms-navigation-authoring-ux.md](./prds/2026-07-23-cms-navigation-authoring-ux.md) — status **Approved** (2026-07-23). Next: implement M1 (nav + Home) on a feature branch.

---

### 2026-07-23 — PRD-first product workflow locked

**Done:**
- Adopted idea → develop → blind spots → improve → lock decision → PRD → lock PRD → implement
- Agent rule: [`.cursor/rules/prd-first-workflow.mdc`](../.cursor/rules/prd-first-workflow.mdc)
- Documented in root [README.md](../README.md) §5.1

**Next:** Next product slice (e.g. CMS navigation UX) starts at Idea, not coding.

---

**Branch:** `feature/cms-authoring-quality-pack`

**Model:** Centre-wide owns SPA types (`news`…`alert`). Each research dept owns `research_group` + `research_project` (dept → groups → projects). Legacy fields from [page_id=244](https://www.crsic.dz/?page_id=244).

**Shipped:** migration `022`; CMS dashboard/API for groups & projects; publish `data/research-groups.json` + `data/research-projects.json`; SPA `#research` loads groups; `#research-project/{slug}` detail. Seed: `npm run db:seed:research-groups` (8 groups + sample project from page 244). Smoke: `npm run db:smoke:research` (group+project four-eyes → JSON).

**Next (UX):** CMS navigation revisit — role-grouped IA, fewer round-trips between lists/forms/queues, smoother day-to-day authoring (stakeholder note 2026-07-23).

---

### 2026-07-22 — Org content types unique across orgs

**Branch:** `feature/cms-authoring-quality-pack`

Each content type maps to one SPA section and may be assigned to **only one** org. Migration `021` consolidates duplicates (prefer `centre_wide`) + unique index. Org scopes UI shows type ownership map and exclusive assign/unassign per org.

---

### 2026-07-22 — Org catalogs + global Editor content-type exclusivity

**Branch:** `feature/cms-authoring-quality-pack`

**Decisions:** (1) each org unit has a content-type catalog; (2) at most one Editor CMS-wide per content type; (3) Reviewer↔Editor assignment stays org-overlap; Reviewer exclusive orgs unchanged.

**Shipped:** migration `020_org_content_catalog_editor_type_exclusive.sql` (`org_unit_content_types`, `editor_content_type_claims`); lib asserts + claim sync; content create/update rejects org/type pairs outside catalog; Reviewer nav types = org catalog union; Org scopes / Users / Editors UI for catalogs and exclusivity.

**Ops note:** if migrate fails on duplicate Editor types, keep one Editor per type then re-run — see CMS-OPS §4.

---

## Status snapshot

| Item | Status |
|------|--------|
| Audit P0–P3 | **Closed** |
| Public site JSON / locales / safe DOM | **Done** |
| Git repository | **On GitHub** — https://github.com/hc-medamine/CRSIC-2026 |
| Git workflow docs | **Done** — [README.md §5](../README.md) |
| Step 2 — home events from JSON | **Done** |
| Step 3 — smoke checklist habit | **Done** — [qa/SMOKE.md](./qa/SMOKE.md) |
| Step 3.5 — UI/UX audit / responsive / motion | **Done** — [audits/UIUX.md](./audits/UIUX.md) |
| P2 a11y / i18n / org stack / will-change | **Done** on `main` — [audits/PARITY.md](./audits/PARITY.md) |
| Home pubs mobile carousel | **Done** on `main` |
| Docs layout under `docs/` | **Done** |
| Root redirect stubs removed | **Done** |
| Docs sync (README tests / tree) | **Done** (this entry) |
| Step 4 — internal app + DB (no external CMS) | **Done** on `main` — PR [#2](https://github.com/hc-medamine/CRSIC-2026/pull/2) (2026-07-20) |
| Public detail pages (news / events / pubs) | **Done** on `main` — PR [#3](https://github.com/hc-medamine/CRSIC-2026/pull/3); study-case sample bodies only |
| Fill remaining public detail copy | **Paused** — do not block on editorial; resume only when stakeholder has source text |
| Feature delivery workflow | **Locked** — new work on a feature branch until fully stable, then merge to `main` |
| CMS PRD | **Approved** (2026-07-21) |
| CMS Phase 2 | **Paused** — #1–#3 on `main`; #4 cancelled; #5 malware postponed until go-live |
| CMS Phase 3 | **Done** on `main` — PR [#9](https://github.com/hc-medamine/CRSIC-2026/pull/9); partners + alerts (Pages CMS removed) |

---

## Changelog

### 2026-07-22 — Org scopes dedicated CRUD page

**Branch:** `feature/cms-authoring-quality-pack`

**Shipped:** `/dashboard/org-units` (SA) — create / edit / delete org units; `PATCH`/`DELETE /api/org-units/[id]`; delete blocked when content still references the unit. Users page links here instead of inline create.

---

### 2026-07-22 — SA can add org scopes

**Branch:** `feature/cms-authoring-quality-pack`

**Shipped:** `POST /api/org-units` + **Add org scope** form on Users page (name AR/EN, kind, optional id). New units appear in scope checkboxes and content forms; assign to Editors/Reviewers after create. Audit `org.create`.

---

### 2026-07-22 — SA hard delete + Reviewer exclusive orgs / light editor manager

**Branch:** `feature/cms-authoring-quality-pack`

**Shipped:**
- Migration `019_reviewer_org_exclusive.sql` + `reviewer_org_claims` (one Reviewer per org).
- Reviewers are org-scoped for queues/lists/view (SA remains centre-wide).
- `/dashboard/editors` — Reviewer/SA light manager: edit Editor **content types** only for assigned Editors (org overlap).
- SA Users: create Reviewer with exclusive orgs; edit scopes; hard delete with delete-impact + mandatory reassignment of non-drafts (drafts cascade).

**Also on branch:** authoring quality pack (D/C/B/A1).

**Next:** Stakeholder smoke → PR when ready.

---

### 2026-07-22 — Authoring quality pack: B + A1 on branch

**Branch:** `feature/cms-authoring-quality-pack`

**Shipped on branch (B):** H1 sanitize (`sanitizeBody.ts` + `sanitize-html`); `RichBodyEditor` on news/events/pubs body AR/EN; sanitize on create/update/publish payloads; SPA `js/safeBody.js` + detail list styles. Events form also gained summary fields (were in state/API only).

**Shipped on branch (A1):** migration `018_preview_tokens.sql`; `POST /api/content/[id]/preview`; public `GET /api/public/preview/[token]`; CMS “Open public preview”; SPA `#preview/{token}` + banner. Env: `PUBLIC_SITE_URL` (CMS), `PREVIEW_API_BASE` (SPA `js/config.js`).

**Also on branch:** D (EN queue), C (SEO).

**Next:** Stakeholder smoke (rich body + preview) → PR when ready.

---

### 2026-07-22 — Authoring quality pack: B (rich body) on branch

**Branch:** `feature/cms-authoring-quality-pack`

**Shipped on branch (B):** H1 sanitize (`sanitizeBody.ts` + `sanitize-html`); `RichBodyEditor` on news/events/pubs body AR/EN; sanitize on create/update/publish payloads; SPA `js/safeBody.js` + detail list styles. Events form also gained summary fields (were in state/API only).

**Also on branch:** D (EN queue), C (SEO).

**Next:** A1 draft preview token.

---

### 2026-07-22 — Authoring quality pack: C (SEO) in progress on branch

**Branch:** `feature/cms-authoring-quality-pack`

**Shipped on branch (C):** migration `017_seo_metadata.sql`; CMS SEO fields (F1, L1 60/160) on news/events/pubs/partners/alerts; publish payloads + SPA detail head/OG (`js/seoHead.js`, P1).

**Also on branch (D):** EN-pending dashboard queue + badges.

**Next:** B (rich body editor H1 allowlist) → A (preview token).

---

### 2026-07-22 — Authoring quality pack: start D (EN-pending queue)

**Branch:** `feature/cms-authoring-quality-pack`  
**PRD:** [2026-07-22-cms-authoring-quality-pack.md](./prds/2026-07-22-cms-authoring-quality-pack.md) (Approved)

**In progress (O1 step D):** Dashboard queue `published` + `en_status=pending`; EN pending/ready badges on lists and item meta. Non-blocking; AR-first unchanged.

**Next on branch:** C (SEO) → B (rich editor) → A (preview token).

---

### 2026-07-22 — PRD approved: CMS authoring quality pack

**Approved:** [docs/prds/2026-07-22-cms-authoring-quality-pack.md](./prds/2026-07-22-cms-authoring-quality-pack.md) — locks: A1 preview token; B2+H1 rich editor; S2+F1+L1+P1 SEO; D1 EN queue; E2 stale deferred; order O1 (D→C→B→A).

**Next:** Implement on feature branches per O1, starting with EN-pending queue.

---

### 2026-07-22 — PRD draft: CMS authoring quality pack

**Draft PRD:** [docs/prds/2026-07-22-cms-authoring-quality-pack.md](./prds/2026-07-22-cms-authoring-quality-pack.md) — public preview, rich body editor, SEO/share meta, EN-pending queue. **Superseded:** approved same day after stakeholder locks.

---

### 2026-07-22 — RBAC: each role sees only what it concerns

**Branch:** `fix/rbac-role-scoped-access`

**Locked:** Editors only see scoped nav modules; content lists/detail are **own items only** (no peer drafts). Media library page is **Super Admin only** (editors/reviewers upload from article forms). Reviewers/SA remain centre-wide for content.

**Shipped:** scoped nav; ownership ACL + queues (incl. editor awaiting-review); media ACL; SA audit filters (action, actor, entity type, from/to).

**Next:** Merge → treat CMS PRD as done until go-live (malware revisit).

---

### 2026-07-22 — Smoke DB cleanup after every test

**Locked:** After every `npm run db:smoke`, purge smoke/test content (and related media/notifications/audit) while keeping real staff + editorial data. Public JSON is rebuilt from remaining live payloads. Standalone: `npm run db:cleanup:smoke`.

---

### 2026-07-22 — CMS polish (title + smoke notification cleanup)

**Shipped:** CMS document title → “CRSIC CMS”; smoke marks notifications read for smoke users/SA so badges do not pile up.

**Next:** Stakeholder confirm → merge → lock PRD done until go-live.

---

### 2026-07-22 — Phase 3 merged (partners + alerts)

**Merged:** PR [#9](https://github.com/hc-medamine/CRSIC-2026/pull/9) → `main`. Stakeholder walk OK; Pages CMS stayed removed.

**Next:** Bug / improvement pass on what’s shipped so far → then treat CMS PRD as done until go-live (malware revisit).

---

### 2026-07-22 — Phase 3 Pages CMS removed

**Locked:** Stakeholder dropped About/Cooperation/Organisation/Contact from the CMS. Those texts stay in `data/locales/*.json` only. Phase 3 keeps **partners** + **alerts**.

**Shipped:** removed Pages dashboard/API/libs, `site-copy.json` overlay, seed-site-pages; migration `016_drop_static_pages.sql`.

**Next (paused for stakeholder):** Local-only until full Phase 3 review — **do not push/PR/merge** yet. Then merge → bug/improvement pass → consider PRD done until go-live.

---

### 2026-07-21 — Phase 3 partners, alerts, static pages (branch)

**Branch:** `feature/phase3-partners-alerts-pages`

**Locked:** Partners CMS → `partners.json`; site alert banner → `alerts.json` (one published). Static pages into CMS were included then **removed** 2026-07-22.

**Shipped on branch:** migration `015_phase3_partners_alerts_pages.sql`; partners/alerts libs + APIs + dashboard; SPA alert banner; smoke paths.

**Next (paused for stakeholder):** Local-only until full Phase 3 review next session — **do not push/PR/merge** yet. Then smoke UI → merge → bug/improvement pass → consider PRD done until go-live. **Superseded in part:** Pages removed 2026-07-22.

---

### 2026-07-21 — Phase 2 #5 malware scanning postponed until go-live

**Locked:** No in-app ClamAV / quarantine / scan-status pipeline before production host is chosen. Upload security stays MIME/size allowlist (+ magic-byte sniff). Revisit antivirus options at go-live with the real hosting environment.

**Next:** Phase 2 governance slice paused; Phase 3 / go-live prep or other stakeholder-named work. **Superseded:** Phase 3 started on branch.

---

### 2026-07-21 — Phase 2 #4 scheduled publish cancelled

**Locked:** Stakeholder dropped timed auto-publish entirely. Publish remains **manual** Approve → Publish (plus Phase 2 #3 emergency bypass). No `scheduled` status, cron, or schedule UI.

**Next:** Optional Phase 2 #5 malware scanning, or pause Phase 2. **Superseded:** #5 postponed until go-live; Phase 2 paused.

---

### 2026-07-21 — Phase 2 #3 emergency bypass + post-publication review (branch)

**Branch:** `feature/phase2-emergency-bypass`

**Locked:** SA-only emergency publish from draft/changes_requested/submitted/approved → live + `needs_post_review`; required reason (comment + audit); Confirm OK blocked for bypass actor; Unpublish / Request changes outcomes; Away freeze on post-review; notify Reviewers+SA on bypass.

**Shipped:** migration `014_emergency_bypass.sql`, `emergency.ts` + `/api/content/emergency`, Emergency panel + dashboard queue, smoke paths.

**Next:** Stakeholder smoke → merge → Phase 2 #4 scheduled publish (if still wanted). **Superseded:** #4 cancelled; #3 merged PR #6.

---

### 2026-07-21 — Phase 2 #2 escalation / delegation / OOO (branch)

**Branch:** `feature/phase2-escalation-delegation`

**Locked:** Delegate (V2 SA confirm) + Escalate (author/reviewer/SA, required note) + OOO (elevate one Editor to temp Reviewer; freeze Away review actions; dual-notify Away + all Editors; until-date). Submit notifies review owner if set, else broadcast.

**Future reminder:** when department scopes drive notify routing, revisit “all Editors” fan-out → prefer same-department Editors.

**Next:** Stakeholder smoke → merge → Phase 2 #3 emergency bypass. **Done** — merged PR #5; #3 on branch.

---

### 2026-07-21 — Phase 2 #1 item-level comment threads (branch)

**Branch:** `feature/phase2-item-comments`

**Locked decisions:**
1. Item-level thread only (no field-level / @mentions)
2. Who posts: Author + Reviewer + Super Admin
3. Any status
4. Request changes / Reject notes always append to the thread
5. Keep `review_note` as latest queue summary
6. Append-only (no edit/delete) — plan default

**Shipped on branch:** `content_comments` table + backfill; shared `CommentThread` on news/event/publication detail; API `GET/POST /api/content/[id]/comments`; workflow hooks; in-app notify on general comments; smoke coverage.

**Also on this branch (2026-07-21 follow-ups):**
- Reassign rule **B**: Reviewers assign to Editor/Reviewer only; only Super Admin may assign to Super Admin.
- Edit/review shows **Editor** (author), **Reviewer** (last approve/changes/reject), **Publisher** (last publish) beside Status.

**Next:** Stakeholder smoke → merge to `main` when stable → Phase 2 #2 escalation/delegation.

---

### 2026-07-21 — PRD Approved; Phase 2 effort order

**Locked:** CMS PRD status → **Approved** (stakeholder; was still marked Review by omission). Editorial fill remains paused. New work stays on feature branches until stable.

**Phase 2 priority (least effort → most complex):**
1. Richer in-app comments (item-level threads on existing review notes first; field-level later if needed)
2. In-app escalation / delegation (extend reassign + notifications; OOO / backup reviewer)
3. Emergency bypass + post-publication review
4. ~~Scheduled publish~~ — **Cancelled** (2026-07-21); manual publish only
5. ~~Optional malware scanning~~ — **Postponed until go-live** (2026-07-21); revisit with production host

**Next:** Stakeholder confirms starting with #1 (or picks another number) → open feature branch from `main`.

---

### 2026-07-21 — Pause editorial fill; feature-branch gate for new work

**Locked:**
- Editorial fill of remaining public `summary`/`body`/media stays **paused** as long as detail/lightbox/CMS publish behave as shipped.
- Incoming features: implement on a **feature branch** until fully stable (smoke / stakeholder confirm), then merge to `main`. Do not land unfinished work on `main`.

**Next:** Stakeholder names the next feature → open branch from `main` and start there.

---

### 2026-07-20 — Session wrap-up (pause)

**Shipped to `main` this session:**
1. **CMS Phase 1 merge-complete** — PR [#2](https://github.com/hc-medamine/CRSIC-2026/pull/2) (`feature/step4-internal-cms`): auth, users, news/events/publications workflows, media, audit, queues, revisions, Super Admin delete for unpublished/rejected, unpublished dashboard queue.
2. **Public detail pages** — PR [#3](https://github.com/hc-medamine/CRSIC-2026/pull/3): public JSON + CMS publish fields (`id`, `slug`, `summary`, `body`, `media[]`); hash routes `#news|event|publication/{slug}`; shared lightbox for news/events/pubs → full detail; images/PDFs fully visible (`object-fit: contain` + PDF embed).
3. **Study-case sample copy** (`d097d58`) for three items only (news الجنوب / pub علم نفس الصحة / event سماع الشيوخ). Remaining editorial fill **paused** — no source data this session.

**Smoke:** lightbox → تفاصيل; deep link; contain images — PASS before merge of PR #3.

**Resume next session:**
- Fill remaining `summary` / `body` / multi-media from stakeholder source (CMS or `data/*.json`).
- Optional: CMS Phase 2 backlog (emergency bypass, auditor role, …).

Branch at pause: **`main`** @ `d097d58` (plus this log commit).

---

### 2026-07-20 — Detail pages merged; sample bodies for study cases

**Done:** Merged PR #3 (`feature/public-detail-pages` → `main`). Smoke: news/pub lightbox → detail; deep link; `object-fit: contain`.

**Content:** Filled `summary`/`body` (+ extra image where useful) for three study-case items:
- News: انطلاق المشروع الوطني لاسترجاع التراث… في ولايات الجنوب
- Publication: مدخل إلى علم نفس الصحة
- Event: الملتقى الدولي الثقافي لسماع الشيوخ — الطبعة العاشرة

**Next:** Continue filling remaining items via CMS/JSON; optional gallery polish / Phase 2.

---

### 2026-07-20 — Public detail pages (news, events, publications)

**Done on `feature/public-detail-pages`:**
- Public JSON + CMS publish emit `id`, `slug`, `summary`, `body`, `media[]`; attachments column + multi-upload UI.
- SPA hash routes `#news/{slug}`, `#event/{slug}`, `#publication/{slug}` with detail shell; **shared lightbox teaser** for news, events, and publications + “View full details”.
- Legacy JSON backfilled (`scripts/backfill-public-detail-fields.mjs`).

**Next:** Smoke deep links + PR merge when ready.

---

### 2026-07-20 — CMS merge-complete

**Done:** Stakeholder confirmed merge-complete. Restored `data/publications.json` to committed real data (dropped local formatting drift). Merging `feature/step4-internal-cms` → `main`.

**Next:** Public detailed news + publication pages on the SPA.

---

### 2026-07-20 — Super Admin delete + unpublished dashboard queue

**Done:**
- Super Admin can permanently delete **unpublished** or **rejected** items (`deleteContentItem`; audit `*.delete`; revisions cascade).
- Dashboard **Unpublished** queue for concerned parties: Reviewer/SA see all; Editors see own + scoped org/type items.
- Rejected queue also visible to Reviewer/SA (not only author).
- SMOKE-CMS I1/I9 updated.

**Next:** Confirm UI (unpublish → dashboard queue; SA delete); then merge when stakeholder says merge-complete.

---

### 2026-07-20 — Bugbot fixes before merge-complete

**Why:** Stakeholder requires Bugbot findings fixed before CMS merge-complete.

**Fixed:**
- Content GET + detail pages enforce `canViewContentItem` (org/content scope)
- Publish/unpublish rolls back DB live columns if public JSON rebuild fails
- Rebuild order: `live_at DESC, created_at ASC`; legacy import staggers `live_at` and keys events by title+scope
- Rejected items moved to their own queue; author can **Reopen as draft**

**Next:** Stakeholder re-smoke / confirm merge-complete.

---

### 2026-07-20 — Phase‑1 completion gaps closed (queues, preview, RTL, revisions, cutover)

**Why:** Merge gate requires the CMS to be fully complete, not only smoke‑green. Closed all nine
remaining completion items on `feature/step4-internal-cms` (no merge to `main`).

**Done:**
- **Action‑queue dashboard** (`/dashboard`): Awaiting review, Needs revision, My drafts, Recently
  published — role/permission scoped; rows link to the right detail page. New helper
  `cms/src/lib/content/queues.ts`.
- **Publish preview** (`PublishPreview`) of the P1 public card on all three detail forms.
- **Full RTL admin chrome**: `CmsChrome` shell with AR RTL / EN LTR toggle persisted in `cms_lang`
  cookie; localised nav labels (`cms/src/lib/i18n/labels.ts`); nav + logout moved into the shell.
- **Restore prior revision** (Reviewer/Super Admin): API action `restore_revision` + button in
  `RevisionHistory`; applies snapshot fields and sets status `draft`.
- **Published → create revision (public stays live)**: migration `010_live_payload.sql`
  (`live_payload JSONB`, `live_at`); rebuilders now emit from rows where `live_payload IS NOT NULL`;
  publish sets it, unpublish clears it, new `start_revision` keeps it while status → `draft`.
- **Draft reassignment** (Super Admin/Reviewer): API action `reassign` + `ReassignAuthor` UI +
  `/api/content/assignable-users`; audited as `content.reassign`; new author notified.
- **Legacy cutover**: `npm run db:import-legacy` imports current `data/*.json` as live published
  items (idempotent, keeps `covers.length === pubs.length`, does not rewrite JSON) —
  [runbooks/CMS-CUTOVER.md](./runbooks/CMS-CUTOVER.md).
- **Backup/restore drill** logged in [runbooks/CMS-OPS.md](./runbooks/CMS-OPS.md) §8: `pg_dump`
  unavailable on this dev machine → documented SQL fallback (no dump files committed).
- **Docs**: real staff accounts recorded (`cms/README.md` + PRD decision log, closing the named‑people
  TBD; `smoke.*` labelled automation‑only); SMOKE‑CMS section I added.

**Verify:** `npm run db:migrate` (010 applied), `npm run build` (green), `npm run db:smoke`
(SMOKE PASS; `data/news.json` restored from snapshot — no wipe).

**Files:** `cms/sql/010_live_payload.sql`, `cms/src/lib/content/{queues,lifecycle}.ts`,
`cms/src/lib/i18n/labels.ts`, `cms/src/lib/publish/*Json.ts`, `cms/src/lib/content/{news,events,publications}.ts`,
`cms/src/app/dashboard/{cms-chrome,publish-preview,reassign-author,revision-history,page,layout}.tsx`,
`cms/src/app/dashboard/**/[id]/page.tsx`, `cms/src/app/dashboard/**/*-form.tsx`,
`cms/src/app/api/{news,events,publications}/[id]/route.ts`, `cms/src/app/api/content/assignable-users/`,
`cms/scripts/import-legacy.ts`, `cms/package.json`, `docs/runbooks/CMS-{OPS,CUTOVER}.md`,
`docs/qa/SMOKE-CMS.md`, `cms/README.md`, PRD, this file.

**Next:** Manual UI pass of SMOKE‑CMS §A–I; merge `feature/step4-internal-cms` → `main` only when
explicitly requested.

---

### 2026-07-20 — Merge blocked until CMS fully complete

**Why:** Stakeholder: do not merge until CMS is fully complete (not only smoke-green).

**Gate:** No PR/merge `feature/step4-internal-cms` → `main` until remaining Phase‑1 completion items are done (see list in chat / next entries). Phase 2/3 and public detail pages stay out of this gate unless explicitly added.

**Next:** Close completion gaps (queues, preview, RTL chrome, restore revision, published→revision flow, draft reassignment, backup drill, real staff seeds, legacy JSON policy).

---

### 2026-07-20 — SMOKE-CMS confirmed (manual + automated)

**Why:** Merge gate requires zero-friction CMS path.

**Done:** Stakeholder confirmed SMOKE-CMS (UI + ops checks). Automated `npm run db:smoke` already green.

**Next:** Merge `feature/step4-internal-cms` → `main` when explicitly requested.

---

### 2026-07-20 — CMS runbook + revision history UI

**Why:** Phase 1 remaining gaps before merge gate.

**Done:**
- Ops runbook: backup/restore DB+media+JSON, Super Admin password reset, offboarding — [runbooks/CMS-OPS.md](./runbooks/CMS-OPS.md)
- Revision history on news/events/publications detail pages (list + optional side-by-side compare)
- `GET /api/content/[id]/revisions`

**Files:** `docs/runbooks/CMS-OPS.md`, `cms/src/lib/content/revisions.ts`, `cms/src/app/api/content/[id]/revisions/`, `cms/src/app/dashboard/revision-history.tsx`, detail pages, docs

**Next:** Confirm SMOKE-CMS H1–H3; merge when zero friction.

---

### 2026-07-20 — Audit log + CMS smoke checklist

**Why:** PRD MVP requires audit of auth, user admin, content lifecycle, uploads, publish; merge gate needs a CMS smoke path.

**Done:**
- `audit_log` table (append-only via app); Super Admin UI `/dashboard/audit` + `GET /api/audit`
- Instrumented login/logout, user admin, media upload/replace, news/events/publications lifecycle
- [docs/qa/SMOKE-CMS.md](./qa/SMOKE-CMS.md) + `npm run db:smoke` (news four-eyes path; restores `news.json` from `.bak`)

**Files:** `cms/sql/009_audit_log.sql`, `cms/src/lib/audit.ts`, API/UI/instrumentation, `cms/scripts/smoke-cms.ts`, docs

**Next:** Manual UI pass of SMOKE-CMS; merge when zero friction.

---

### 2026-07-20 — Media upload (5 MB, images+PDF, stable paths)

**Why:** Phase 1 media library; editors need upload instead of hand-typed paths.

**Locked:** 5 MB; JPEG/PNG/WebP + PDF; `img/cms/{news|events|covers}/`; replace keeps same public path.

**Done:**
- `media_assets` table + magic-byte allowlist validation
- `POST /api/media`, `POST /api/media/[id]` (replace)
- Upload UI on news/events/publications forms + `/dashboard/media`
- Staging `cms/uploads/` + public write under `img/cms/` (gitignored binaries)

**Files:** `cms/sql/008_media.sql`, `cms/src/lib/media/`, `cms/src/app/api/media/`, dashboard media + form wiring, docs

**Next:** Smoke-test draft → review → publish for all three types; audit log if still open; merge when zero friction.

---

### 2026-07-20 — Auto-apply DB migrations on dev/build

**Why:** Avoid forgetting `db:migrate` after pulling new SQL files.

**Done:**
- `schema_migrations` tracking — each `sql/*.sql` applied once
- `predev` / `prebuild` run `db:migrate` automatically
- `npm run db:status` reports tables + event/pub columns

**Files:** `cms/scripts/migrate.ts`, `cms/scripts/check-migrations.ts`, `cms/package.json`, docs

**Next:** Done — see Media upload entry above.

---

### 2026-07-20 — Step 6: publications workflow (draft → publish)

**Why:** Third MVP content type; must keep public `covers.length === pubs.length`.

**Done:**
- `pub_kind` (collective/individual) on `content_items`; dept via `label_ar`, desc via `summary_ar`, cover via `image_path`
- Same editorial workflow + four-eyes + notifications as news/events
- Publish rebuilds `data/publications.json` (with `.bak`); validates cover/pubs alignment
- UI: `/dashboard/publications`, `/new`, `/[id]`

**Note:** First CMS publish replaces `publications.json` with CMS-published items only (backup at `.bak`).

**Files:** `cms/sql/007_publication_fields.sql`, `cms/src/lib/content/publications.ts`, `cms/src/lib/publish/publicationsJson.ts`, `cms/src/app/api/publications/`, `cms/src/app/dashboard/publications/`, docs

**Next:** Media upload for covers/images, or smoke-test + merge gate when zero friction.

---

### 2026-07-20 — Step 5: events workflow (draft → publish)

**Why:** Second content type per PRD; same review path as news.

**Done:**
- Event fields on `content_items` (scope intl/nat, day/month/year, type, display upcoming/done)
- Editor/reviewer workflow + four-eyes + notifications
- Publish rebuilds `data/events.json` (with `.bak`); P1 Arabic public fields
- UI: `/dashboard/events`, `/new`, `/[id]`

**Files:** `cms/sql/006_event_fields.sql`, `cms/src/lib/content/events.ts`, `cms/src/lib/publish/eventsJson.ts`, `cms/src/app/api/events/`, `cms/src/app/dashboard/events/`, docs

**Next:** Step 6 — Publications workflow (done — see entry above).

---

### 2026-07-20 — Step 4: news workflow (draft → publish)

**Why:** First content type end-to-end per PRD.

**Done:**
- `content_items` + `content_revisions` for news
- Editor: create/edit draft, checklist submit, withdraw
- Reviewer: request changes / approve / reject / publish / unpublish (four-eyes)
- In-app notifications on workflow events
- Publish rebuilds public `data/news.json` (P1: AR title/label/img); writes `.bak` backup first
- UI: `/dashboard/news`, `/dashboard/news/new`, `/dashboard/news/[id]`

**Note:** First CMS publish replaces `data/news.json` with CMS-published items only (backup at `news.json.bak`). Re-import of legacy static news is a later task.

**Files:** `cms/sql/005_news_content.sql`, `cms/src/lib/content/`, `cms/src/lib/publish/`, `cms/src/app/api/news/`, `cms/src/app/dashboard/news/`, docs

**Next:** Step 5 — Events workflow (or media upload for news images).

---

### 2026-07-20 — Step 3: in-app notifications skeleton

**Why:** PRD requires in-app notifications only (no email) before content workflows emit events.

**Done:**
- Table `notifications`
- Helpers + `GET`/`PATCH /api/notifications`
- UI `/dashboard/notifications` (list, mark read / mark all)
- Dashboard unread count link
- Optional welcome seed: `npm run db:seed:welcome-notifications`

**Files:** `cms/sql/004_notifications.sql`, `cms/src/lib/notifications.ts`, `cms/src/app/api/notifications/`, `cms/src/app/dashboard/notifications/`, docs

**Next:** Step 4 — News content workflow (draft → submit → review → publish).

---

### 2026-07-20 — Step 2: profile self-edit

**Why:** PRD — users may edit display name / AR / EN name; not role or scopes.

**Done:**
- `/dashboard/profile` form
- `GET`/`PATCH /api/profile` (own account only)
- Dashboard link “My profile”
- Email and role shown read-only

**Files:** `cms/src/app/dashboard/profile/`, `cms/src/app/api/profile/route.ts`, `cms/src/app/dashboard/page.tsx`, `docs/WORKLOG.md`

**Next:** Step 3 — in-app notifications skeleton (or stakeholder chooses to jump to content types).

---

### 2026-07-20 — Fix session save in Server Components

**Why:** Next.js forbids modifying cookies from Server Components; `requireUser()` called `session.save()` on `/dashboard` and bounced to login.

**Done:**
- `requireUser()` is read-only
- Idle refresh via `POST /api/auth/touch` + `SessionTouch` client component

**Files:** `cms/src/lib/auth/session.ts`, `cms/src/app/api/auth/touch/route.ts`, `cms/src/app/dashboard/session-touch.tsx`, `cms/src/app/dashboard/layout.tsx`

---

**Why:** Login API returned 200 but session cookie was not set on the response, so `/dashboard` redirected back to `/login`.

**Done:**
- Login/logout use `getIronSession(req, res)` so `Set-Cookie` is attached
- After login, hard navigate to `/dashboard`

**Files:** `cms/src/lib/auth/session.ts`, `cms/src/app/api/auth/login/route.ts`, `cms/src/app/api/auth/logout/route.ts`, `cms/src/app/login/page.tsx`

**Next:** Confirm login → dashboard works; then Step 2 profile self-edit.

---

### 2026-07-20 — Step 1: org units + Super Admin user management

**Why:** Complete Phase 0 access control before content workflows.

**Done:**
- Seeded org units: centre-wide + 4 research departments
- Tables `user_org_scopes`, `user_content_scopes`
- Super Admin UI `/dashboard/users`: create users, activate/deactivate, reset password (in-app, no email)
- Reviewer/Super Admin auto-scoped to all orgs + all content types; Editors require explicit scopes
- Link from dashboard for Super Admin

**Files:** `cms/sql/002_*.sql`, `cms/sql/003_*.sql`, `cms/src/lib/users.ts`, `cms/src/app/dashboard/users/`, `cms/src/app/api/users/`, docs

**Next:** Step 2 — profile self-edit (name/info) for signed-in users.

---

### 2026-07-20 — Auth skeleton + Super Admin seed

**Why:** Phase 0 login path for Step 4 CMS.

**Done:**
- SQL `users` table + `user_role` enum (`super_admin` / `editor` / `reviewer`)
- `npm run db:migrate` / `npm run db:seed:super-admin`
- Login at `/login` (email + password); dashboard at `/dashboard`; logout
- Session: `iron-session`, idle timeout 30 minutes
- Seeded Super Admin: **F. Chettih** (`f.chettih@crsic.dz`) — password only in local `.env.local` (not committed)
- Names stored: AR فاطمة الزهرة شتيح / EN Fatima El Zahra Chettih

**Files:** `cms/sql/`, `cms/scripts/`, `cms/src/lib/auth/`, `cms/src/app/login/`, `cms/src/app/dashboard/`, `cms/src/app/api/auth/`, docs

**Next:** User management UI (create editors/reviewers, Super Admin password reset) or content types — prompt stakeholder.

---

### 2026-07-20 — Phase 0 scaffold: cms/ + crsic_db

**Why:** Start Step 4 implementation after product decisions and Postgres install.

**Done:**
- Created PostgreSQL database **`crsic_db`** and role **`crsic_cms_app`** (owner; rights scoped to that DB)
- Scaffolded **Next.js** app at **`cms/`** (App Router, TypeScript, Tailwind)
- Added `pg` + `src/lib/db.ts` + `GET /api/health/db`
- Added `cms/.env.example`, local `.env.local` (gitignored), `cms/README.md`
- Root `.gitignore`: `.next/` / `out/`
- README tree + PRD decision: app path `cms/`

**Files:** `cms/**`, `.gitignore`, `README.md`, `docs/WORKLOG.md`, `docs/prds/2026-07-19-internal-content-management.md`

**Next:** Auth skeleton (login, Super Admin seed, 30m session) — prompt for first Super Admin identity before seeding.

---

### 2026-07-20 — Phase 0 product decisions locked (DB, session, i18n, checklist)

**Why:** Stakeholder answered remaining open questions before Next.js scaffold.

**Done:**
- DB: **`crsic_db`** + role **`crsic_cms_app`** (rights only on that DB)
- Session: **30 minutes**
- AR authoritative; EN optional/pending; current public EN behaviour for MVP
- Public JSON: **plain text only**
- Event `upcoming`/`done`: **manual**
- Personal data MVP: editorial checklist + Super Admin unpublish
- PRD §15 / Decision log updated

**Files:** `docs/prds/2026-07-19-internal-content-management.md`, `docs/WORKLOG.md`

**Next:** Prompt for app folder path + Postgres bootstrap credentials → scaffold Next.js on `feature/step4-internal-cms`.

---

### 2026-07-20 — Node framework locked: Next.js

**Why:** Stakeholder chose framework for Step 4 CMS.

**Done:**
- PRD Decision log + §11: **Next.js (App Router)**
- Open question §15.14 closed

**Files:** `docs/prds/2026-07-19-internal-content-management.md`, `docs/WORKLOG.md`

**Next:** Prompt remaining Phase 0 questions (DB name/user, session, AR/EN, formatting, events, privacy) → then scaffold.

---

### 2026-07-20 — Ambiguity policy corrected (prompt-only)

**Why:** Stakeholder requires strict prompting for every undecided point — never assume, never silent default.

**Done:**
- PRD document rule + A10 rewritten to prompt-only policy
- Re-opened: session timeout, AR/EN conflict, public card formatting, event auto-`done`, Node framework, privacy SOP
- Removed invented “defaults locked” language from prior same-day entry

**Files:** `docs/prds/2026-07-19-internal-content-management.md`, `docs/WORKLOG.md`

**Next:** Prompt on open questions listed in PRD §15 (items 8–14).

---

### 2026-07-20 — Step 4 implementation branch + PRD amendments

**Why:** Lock no-email policy, local-only development stack, and Git workflow before building.

**Done:**
- Created branch `feature/step4-internal-cms` (merge to `main` only when fully functional / zero known bugs)
- PRD amendments: no email/SMTP features; Super Admin in-app password reset; in-app notifications only
- Dev environment locked: this Windows machine, Cursor Pro, PostgreSQL **18.4-2**, Node
- Go-live only after zero-friction local completion
- Ambiguity policy corrected: **always prompt stakeholder; never assume; never silent default**
- Re-opened for prompt: session timeout, AR/EN conflict, card formatting, event auto-`done`, Node framework, privacy SOP
- README §10 Step 4 status updated to implementation branch

**Files:** `docs/prds/2026-07-19-internal-content-management.md`, `docs/prds/README.md`, `docs/WORKLOG.md`, `README.md`

**Next:** Prompt stakeholder on open PRD questions → then Phase 0 local scaffold on `feature/step4-internal-cms`.

---

### 2026-07-19 — Step 4 PRD decisions locked (Review)

**Why:** Close open discovery questions before implementation.

**Decisions recorded in PRD:**
- Success = end-to-end CMS publish works (no minimum news volume **N**)
- Public schema **P1** (compatible JSON subset); richer public detail pages deferred
- Manual publish only (no scheduling in MVP)
- Roles: Super Admin; Reviewer = centre-wide + all research depts; Editor = defined scopes and/or centre-wide; users can edit name/info after account creation
- Preferred stack: **Node + local Postgres** (hosted Supabase rejected for Algeria residency)

**Pending (not MVP):** more detailed public pages for **news** and **publications** (schema + SPA UI). Do not start until CMS publish path is stable under P1.

**Files:** `docs/prds/2026-07-19-internal-content-management.md`, `docs/prds/README.md`, `docs/WORKLOG.md`

**Next:** Stakeholder PRD review (next session) → Approved → Phase 0 host check (Node + Postgres on `crsic.dz`).

---

### 2026-07-19 — Docs sync with project status

**Why:** README still claimed “no tests” while `tests/` and `js/a11y.js` shipped; roadmap omitted the stub-removal step.

**Done:**
- README §2: Node `node --test` documented; lint/format still none
- README §3 tree: added `js/a11y.js`
- README §10: root stubs removal marked **Done**
- Status snapshot + this entry kept current

**Files:** `README.md`, `docs/WORKLOG.md`

**Next:** Step 4 design — first PRD under `docs/prds/`.

---

### 2026-07-19 — Remove root Markdown stubs

**Why:** Root “Moved” stubs were confusing; the real docs already live under `docs/`.

**Done:**
- Deleted root stubs: `WORKLOG.md`, `SMOKE.md`, `AUDIT.md`, `UIUX.md`, `PARITY.md`
- Kept root `README.md` only
- Updated README tree + docs index wording

**Files:** deleted root stubs; `README.md`, `docs/README.md`, `docs/WORKLOG.md`

**Next:** Step 4 design — first PRD under `docs/prds/`.

---

### 2026-07-19 — Docs reorganisation under `docs/`

**Why:** Project Markdown had grown at the repo root without a clear home for process, audits, and future PRDs. Maintenance needs one index, stable redirects, and a place for Step 4 product specs.

**Done:**
- Created `docs/` with subfolders `qa/`, `audits/`, `prds/`
- Moved `WORKLOG.md` → `docs/WORKLOG.md`
- Moved `SMOKE.md` → `docs/qa/SMOKE.md`
- Moved `AUDIT.md`, `UIUX.md`, `PARITY.md` → `docs/audits/`
- Added `docs/README.md` (documentation index)
- Added `docs/prds/README.md` + `docs/prds/TEMPLATE.md` for future PRDs
- Briefly left root redirect stubs (removed later same day — see entry above)
- Kept `data/README.md` and `data/CMS.md` beside content (editor-facing)
- Updated root `README.md` navigation, tree, and cross-links
- Branch: `docs/reorganize-structure`

**Files:** `docs/**`, (temporary) root stubs, `README.md`

**Validation commands & results:**

| Command | Result |
|---------|--------|
| `node --test tests/*.test.mjs` | **Pass** — 5/5 (a11y Escape stack + `?lang=` parse) |
| JSON parse of `data/*.json` + locales | **Pass** — all files valid; `covers.length === pubs.length` (36); locale key parity (263 keys) |
| Path presence check for new `docs/` layout | **Pass** |
| Manual browser smoke A–F ([qa/SMOKE.md](./qa/SMOKE.md)) | **Skipped** — docs-only change; no app behaviour modified |

**Next:** Step 4 design — first PRD under `docs/prds/` using the template.

---

### 2026-07-19 — Home publications mobile carousel

**Why:** On mobile, four tall book covers stacked vertically made the homepage feel repetitive and pushed events/news far below the fold.

**Done:**
- `#home-pub-grid` becomes a CSS scroll-snap horizontal carousel at ≤768px (one ~82% card + peek of the next)
- Tablet/desktop multi-column grid unchanged; publications page `#pub-grid` unchanged
- RTL/LTR via `html[dir]` + logical properties; titles clamped to 2 lines in the carousel
- Decorative tilt / hover-lift disabled on coarse/touch pointers
- Aria label `aria_home_pubs` on the home strip
- Merged to `main` (PR #1 + docs follow-up `12680d6`)

**Files:** `css/style.css`, `js/animations.js`, `index.html`, `data/locales/ar.json`, `data/locales/en.json`, `README.md`, `WORKLOG.md`

**Next:** Step 4 design (internal app).

---

### 2026-07-19 — P2 a11y, responsive polish, partial EN parity

**Done:**
- Focus trap + restore for drawer and lightbox; Escape closes topmost dialog only (`js/a11y.js`)
- Org chart stacked layout ≤700px
- `will-change` no longer permanent on hero/cards/parallax
- Contact + lightbox responsive stacking refinements
- i18n: `?lang=`, `data-i18n-aria`, doc title/meta, strategy list wired, mailto labels localized
- EN notice + “View Arabic version” for Arabic-only editorial JSON
- Parity matrix [audits/PARITY.md](./audits/PARITY.md); tests `node --test tests/*.test.mjs`

**Files:** `js/a11y.js`, `js/i18n.js`, `js/ui.js`, `js/animations.js`, `css/style.css`, `index.html`, `data/locales/*`, `tests/`, `PARITY.md`, `UIUX.md`, `WORKLOG.md`, `README.md`

**Not claimed:** full English editorial parity (pubs/events/news/partners/journals bodies).

**Next:** Step 4 design when ready.

---

### 2026-07-19 — First GitHub push

**Done:**
- Authenticated GitHub CLI as `hc-medamine`
- Created public repo [hc-medamine/CRSIC-2026](https://github.com/hc-medamine/CRSIC-2026)
- Pushed `main`, `feature/home-events-json`, `feature/ui-ux-polish` to `origin`

**Files:** remote `origin` only (docs touch in this entry)

**Next:** Step 4 design — internal web app + database (users, roles, publishing).

---

### 2026-07-16 — UI/UX polish (step 3.5)

**Why:** Before designing the internal app, the public site needed LTR correctness, tablet navigation, smoother motion, and safer small-screen layout.

**Done (see [audits/UIUX.md](./audits/UIUX.md)):**
- Direction inherits from `html[dir]` (EN LTR no longer forced RTL by CSS)
- Drawer + bottom tabs from ≤1024px (tablet mega-menu gap closed)
- Drawer slides from inline-start (RTL/LTR aware)
- Home grids: pubs 1-col ≤768; events 2-col ≤1024 then 1-col ≤768
- Tab indicator / title / nav underlines use `transform` not `left`/`width`
- Reduced-motion: scroll, ripple, shimmer gated; parallax clamped
- `overflow-x: clip`; touch targets ≥44px; safe-area padding; `--nav-h`
- Documented audit + deferred P2 items in UIUX.md

**Files:** `css/style.css`, `js/ui.js`, `js/animations.js`, `UIUX.md`, `README.md`, `WORKLOG.md`

**Next:** Merge foundation branches → push to GitHub → then step 4 design (internal app).

---

### 2026-07-16 — Smoke checklist habit (step 3)

**Why:** No automated tests; merges need a repeatable human gate so data/routing/i18n regressions are caught early.

**Done:**
- Added [qa/SMOKE.md](./qa/SMOKE.md) — sections A–F (boot, routes, i18n, features, content invariants, motion/layout)
- Pointed README §5.5 at SMOKE.md; rule: no merge to `main` without at least A–D
- Marked delivery sequence step 3 **Done** in README §10

**Files:** `SMOKE.md`, `README.md`, `WORKLOG.md`

**Next:** Step 3.5 — full UI/UX audit, responsiveness, animation smoothness.

---

### 2026-07-16 — Home events teaser from JSON (step 2)

**Why:** Home “الملتقيات والفعاليات” still had three hard-coded `<article class="event-card">` blocks while publications/news already used empty grids + `renderAll()`. That split would drift as soon as `events.json` changed.

**Done:**
- Replaced hard-coded home event cards with empty `#home-events-grid`
- Added `getAllEvents()` / `getHomeEvents(limit)` in `js/data.js` (merge intl+nat, newest-first via Arabic month rank)
- Added `createHomeEventCard()` in `js/components/eventCard.js` (safe DOM; optional `img`; Holders fallback; badge + details link)
- Wired skeletons, soft-fail container list, and `renderAll()` in `js/ui.js`
- Optional `img` on three featured events in `data/events.json` (Holders 0 / 1 / 5)
- Locale keys `ev_badge_upcoming`, `home_event_loc` (AR + EN)
- `.skeleton-event` in `css/style.css`
- Documented optional `img` + home teaser behaviour in `data/README.md` and README §4 / §6 / §10

**Files:**
- `index.html`
- `js/data.js`
- `js/ui.js`
- `js/components/eventCard.js`
- `data/events.json`
- `data/locales/ar.json`, `data/locales/en.json`
- `data/README.md`
- `css/style.css`
- `README.md`, `WORKLOG.md`

**Behaviour now:**
- Home shows the **3 newest** events automatically when JSON changes
- Events page lists remain unchanged (year groups)
- Order example with current data: Feb 2025 national coordination → Dec 2024 translation → Oct 2024 civilians

**Next:** Step 3 — adopt smoke checklist on every merge; then step 3.5 UI/UX audit.

---

### 2026-07-16 — Git workflow (step 1)

**Done:**
- Initialised local Git repository on branch `main`
- Added [`.gitignore`](../.gitignore) (OS junk, `.claude/`, env secrets, optional Node artefacts; keep `.vscode/settings.json`)
- Documented branching, Conventional Commits, review checklist, and “what to update where” in [README.md](../README.md) §5
- Locked agreed delivery sequence (steps 1 → 4) into README §10 and this status snapshot
- Clarified product direction: internal web app + database later; **no external CMS**
- Initial commit `5bfb745` as `hc-medamine`

**Files:** `.gitignore`, `.git/`, `README.md`, `WORKLOG.md`

**Next:** Step 2 — home events from JSON (this entry above).

---

### 2026-07-16 — Asset cleanup & doc trim

**Done:**
- Deleted unused large media: `img/crsic_door.jpg`, `img/Holders/6.jpg`, `img/nav-crsic-logo2.png`
- Removed all editorial-PRD links and roadmap references from WORKLOG, AUDIT, CMS, and README

**Files:** `img/crsic_door.jpg`, `img/Holders/6.jpg`, `img/nav-crsic-logo2.png` (deleted); `WORKLOG.md`, `AUDIT.md`, `data/CMS.md`, `data/README.md`, `README.md`, `js/config.js`

---

### 2026-07-15 — Audit closure

Verified all AUDIT findings resolved; public site remediation complete.

---

## How to run (public site)

Serve project root over HTTP. Optional: set `CONTENT_BASE_URL` in `js/config.js` for remote published JSON.
