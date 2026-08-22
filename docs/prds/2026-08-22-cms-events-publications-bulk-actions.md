# PRD: CMS events + publications lists — bulk unpublish / recycle

| Field | Value |
|-------|--------|
| Status | **Approved** (2026-08-22) |
| Date | 2026-08-22 |
| Author | Stakeholder + agent |
| Owners | Product / CMS Desk |
| Related roadmap step | Remainder of bulk ops after news list bulk ([2026-08-22-cms-news-bulk-actions.md](./2026-08-22-cms-news-bulk-actions.md), `main` PR #36) |
| Related | [2026-08-22-cms-list-load-more.md](./2026-08-22-cms-list-load-more.md); [2026-08-22-cms-recycle-bin.md](./2026-08-22-cms-recycle-bin.md) |
| Supersedes | Nothing. Single-item Unpublish and Move to recycle bin stay on each type’s edit page. |

## 1. Problem

Events and publications lists still take down or bin **one row at a time**. News already has bulk Unpublish / Recycle on `/dashboard/news`. Reviewers and Super Admins doing the same cleanup on `/dashboard/events` and `/dashboard/publications` still open item → confirm → wait for JSON rebuild → back to the list.

Who feels it: Reviewer (unpublish) and Super Admin (unpublish + recycle). Editors already cannot unpublish or bin; this slice does not change that.

## 2. Goals

- On `/dashboard/events` and `/dashboard/publications`, Reviewer and Super Admin can **select loaded rows** and run **Unpublish** and (SA only) **Move to recycle bin** in one confirm — **the same flow as news**.
- Each selected id is checked with **today’s single-item gates** (`unpublishEvent` / `unpublishPublication` / `recycleContentItem`). No new powers.
- Ineligible rows are **skipped**; the rest proceed. The actor always gets a **per-item report** (*N done, M skipped* + reason). The batch never aborts silently.
- Public JSON is rebuilt **once per type batch** after a bulk unpublish (including unpublish-then-bin), not once per row.

**Non-goals**

- News list (already shipped). Partners, alerts, laws, platforms, research groups/projects lists.
- Editors gaining unpublish or recycle.
- Clone / duplicate (follow-on PRD).
- Import / export UI (follow-on PRD).
- Select-all-in-database (rows not currently loaded).
- Reassign author, desk move, or bulk Align.
- Bulk publish / approve / reject / request-changes / withdraw.
- In-CMS notification flood.
- Recycle bin page bulk (Empty bin / Purge already exist).
- Featured-news playlist prune (news-only; **not used** for events or publications).
- Scheduled publish (**cancelled** — do not reopen).
- Media crop, EN editorial body parity, static pages in CMS, journals (deferred).

## 3. Users & roles

| Role | Needs |
|------|--------|
| Super Admin | Checkboxes + bulk bar on events and publications: **Unpublish**, **Move to recycle bin**. Recycle of **published** items = unpublish then bin in **one** confirm. Same four-eyes as today (cannot unpublish/bin-via-unpublish **own** authored item). |
| Reviewer | Checkboxes + bulk bar: **Unpublish** only. No recycle action (API still SA-only). Per-item publish rights: cannot unpublish own item; cannot unpublish when away-frozen; org/type access unchanged. |
| Editor | **No bulk chrome** (no checkboxes, no bar). Single-item edit pages unchanged. |
| Public visitor | Unpublished events leave `events.json`; unpublished publications leave `publications.json` / `covers.json` the same as a single unpublish. Binned unpublished/rejected items stay off the public site. |

## 4. Requirements

Copy the **news bulk locks verbatim**. Type-specific notes are called out; they do not loosen gates.

### Must have

1. **Surfaces:** `/dashboard/events` and `/dashboard/publications` only. Opt-in on the shared list (same `bulk` prop as news) so partners/laws/etc. do not grow checkboxes by accident. Each list is its own batch — never mix events and publications in one request.
2. **Who sees bulk:** Reviewer and Super Admin only. Editor lists stay as today.
3. **Selection:** Checkbox per **currently loaded** row (first paint + Load more). No “select all in CMS.” Header checkbox = all **on-screen** rows. Changing search/status **clears** selection. Cap = on-screen count; server max **200** ids.
4. **Actions (existing gates, reused — do not fork policy):**
   - **Unpublish** — Reviewer or SA. Per item: same as `unpublishEvent` / `unpublishPublication` (reviewer role, not away, four-eyes / not own, status `published`). Editors cannot.
   - **Move to recycle bin** — SA only. Per item:
     - `unpublished` or `rejected` → `recycleContentItem` (as today).
     - `published` → **unpublish then recycle** in that order, still in **one** confirm modal.
     - Any other status → skip.
   - Reviewer must **not** see recycle in the bulk bar. If they hit the recycle API, skip every id (`Super Admin role required`).
   - **Featured playlist:** do **not** call `pruneFeaturedNewsItem`. That hook is news-only. Events and publications have no curated Home playlist.
5. **Confirm:** One Desk dialog per chosen action: action name, count **X**, Cancel. For recycle, published rows will be **unpublished first, then moved to the bin**. No extra four-eyes prompt.
6. **Partial failure:** Always continue. Return `{ done, skipped }` with reasons. UI: *N done, M skipped*.
7. **No extra four-eyes layer:** Bulk respects per-item publish rights (existing four-eyes still skips own).
8. **Public JSON:** After a bulk that unpublished at least one **event**, rebuild `data/events.json` **once**. After a bulk that unpublished at least one **publication**, rebuild `data/publications.json` **once** (that rebuild already keeps `covers.json` with `covers.length === pubs.length`). Recycle of already-unpublished/rejected rows does not rebuild. Do not touch `news.json` or `featured-news.json`.
9. **Audit:** One audit row per successful item (`event.unpublish` / `publication.unpublish`, `*.recycle`; unpublish-then-bin writes both).
10. **Notifications:** Do **not** enqueue N `*.unpublished` in-CMS pings for a bulk unpublish. Edit-page single unpublish keeps today’s ping.
11. **i18n:** Reuse news bulk AR+EN keys where the copy is type-neutral; add type-specific strings only if “news” appears in the confirm. Keys stay in sync.
12. **Edit pages:** Unchanged.
13. **Visual:** Same as news — list row, native checkbox, `FormStickyActions` bar, Desk modal, `crs-*` palette. Flow: **select → bar → confirm → report → dismiss**.

### Should have

1. Sticky bulk bar when 1+ rows are selected.
2. Disable the action when the selection is empty.
3. Unit tests: Editor skipped; Reviewer recycle skipped; own published skipped; mixed recycle for SA; one rebuild after N unpublishes **per type**; skip report shape; **no featured prune** on these types.

### Nice to have

1. Confirm lists titles — **out** (count + action is enough, as news).
2. Undo toast — **out**.

## 5. Content / data impact

| Surface | Change |
|---------|--------|
| `data/events.json` | Same contract as single event unpublish; **one** rebuild per events bulk unpublish |
| `data/publications.json` + `covers.json` | Same contract as single publication unpublish; **one** rebuild per publications bulk unpublish; keep `covers.length === pubs.length` |
| `data/news.json` / `featured-news.json` | **None** |
| Locales / SPA JS | **None** |
| CMS schema | **None** |
| CMS labels | Reuse news bulk strings; type-specific confirms if needed |

## 6. UX notes

- Identical to news bulk on each list. Row click opens the item; checkbox does not navigate.
- Recycle confirm (SA): **Y** published in the selection will be unpublished first.
- After the request: stay on the current list; report until dismissed.
- Empty / filtered list: no bulk bar.

## 7. Technical notes

- Reuse the news bulk **pipeline** (skip report, max 200, unpublish-then-bin, one rebuild, no notify flood), parameterized by content type. Call `unpublishEvent` / `unpublishPublication` with the same `{ notify: false, rebuild: false }` split the news path uses. Do not invent looser gates.
- Prefer extending the existing `ContentListPage` `bulk` opt-in (`apiPath` per type) over a second list chrome.
- Suggested APIs: `POST /api/events/bulk` and `POST /api/publications/bulk` with `{ action: "unpublish" \| "recycle", ids: string[] }`. Validate `content_type` and `recycled_at IS NULL`.
- Next.js App Router; `searchParams` as `Promise`. Read `cms/node_modules/next/dist/docs/` before coding.
- No public SPA files. No email. No cron. No `pruneFeaturedNewsItem`.

## 8. Success metrics

- Reviewer on events (and separately on publications): unpublish several published items that are not own → they leave the matching public JSON after **one** rebuild; own item skipped (four-eyes); recycle control absent.
- SA mixed recycle on each list: published unpublished then binned; unpublished/rejected binned; drafts skipped; report lists each skip.
- Editor: no checkboxes; bulk API skips every id.
- Public site: unpublished events/publications gone; publication covers count still matches pubs; Home featured **news** playlist unchanged.
- Single-item Unpublish / Move to recycle bin on edit pages still work.

## 9. Open questions

- None blocking. Clone and import/export wait for their own PRDs. Bulk on other types is later.

## 10. Decision log

| Date | Decision |
|------|----------|
| 2026-08-22 | **One PRD** = events **and** publications. Reuse the news bulk-unpublish/recycle flow. |
| 2026-08-22 | **Gates copy news verbatim.** Editor no chrome; Reviewer unpublish only; SA unpublish + recycle; published recycle = unpublish-then-bin in one confirm; four-eyes per item; skip + report; loaded rows only; max 200; no notification flood; one JSON rebuild per type batch. |
| 2026-08-22 | **Adjustment only:** featured-playlist prune is **unnecessary** (news-only). Do not call it for events or publications. |
| 2026-08-22 | Visual lock inherited from news: select → bar → confirm → report → dismiss. |
| 2026-08-22 | **Approved.** Implement on `feature/cms-events-publications-bulk`. |
