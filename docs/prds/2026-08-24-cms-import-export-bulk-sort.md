# PRD: CMS Import/Export picker — bulk export + header sort

| Field | Value |
|-------|--------|
| Status | **Delivered** |
| Date | 2026-08-24 |
| Author | Stakeholder + agent |
| Owners | Product / CMS Desk |
| Related | [2026-08-24-cms-desk-production-boost.md](./2026-08-24-cms-desk-production-boost.md) (I/E page on `main`, PR #44); [2026-08-24-cms-table-header-sort.md](./2026-08-24-cms-table-header-sort.md); [2026-08-22-cms-list-load-more.md](./2026-08-22-cms-list-load-more.md); [2026-08-22-cms-news-bulk-actions.md](./2026-08-22-cms-news-bulk-actions.md) (checkbox chrome only) |
| Extends | The Super Admin Import/Export **page**. Does not reopen crop, EN-when-ready, or Clone Cut 1. |

> Super Admin can check several items of the **current type** on `/dashboard/import-export` and download **one zip**. The picker is a Desk table: Load more (20), header sort this visit, header checkbox = loaded rows. **Export this type** and per-row **Export this item** stay. Type lists stay as they are.

## 1. Problem

The Import/Export page can dump a whole type or one row. Backing up a handful of stories means many one-item downloads, or taking the entire type. The picker is a search list (first 80), not a table, so it does not match bulk + header sort on the rest of the Desk.

Who feels it: Super Admin on handover / machine move.

## 2. Goals

- Super Admin exports **N checked items of one type** as a single CMS zip (same shape as today’s item/type zip: Desk records + `img/` files → import still new drafts).
- The picker feels like a content list: **checkboxes**, **Load more (20)**, **clickable data headers**.
- Existing **Export this type** and per-row **Export this item** still work. Import unchanged.

**Non-goals**

- Import/export buttons on type lists or edit pages (still page only).
- Unpublish / Recycle / Duplicate on the Import/Export page.
- Whole-Desk zip (all types in one archive).
- Import/export for Editors or Reviewers.
- Changing zip rules (new ids, `draft` only, author-by-email, recycled excluded, zip-too-large sentence).
- Changing crop, EN-when-ready, Clone Duplicate, type-list bulk, or type-list header sort.
- Static institutional pages in CMS; journals in CMS; scheduled publish (cancelled).
- `?sort=` / `?page=` / `?type=` on the Import/Export URL; `localStorage` for type, page, or sort.

## 3. Users & roles

| Role | Needs |
|------|--------|
| Super Admin | On `/dashboard/import-export`: pick type; table of that type; check rows; **Export selected**; still export type / one item; import zip → drafts. |
| Editor / Reviewer | Unchanged: no I/E nav or API. Duplicate stays on type lists. |
| Public SPA | Unchanged. No JSON writes until a later four-eyes publish of imported drafts. |

## 4. Requirements

### Must have

1. **Surface:** `/dashboard/import-export` only. Super Admin only. i18n AR+EN.
2. **Picker table** for the selected content type (all nine list types). Columns: checkbox, **Title**, **Status**, **Updated**, Actions (per-row **Export this item**). Recycled rows stay out.
3. **Load more:** page size **20**, same spirit as news/events/publications lists. First paint is the first 20 (or first N pages already loaded). Button hides at the end. Empty type: table empty; **Export this type** stays disabled with today’s reason.
4. **Search:** filters the picked type by Arabic title (existing behaviour). Search **keeps** the current header sort and **resets** to the first 20 of that filter. Changing **type** clears selection, sort, search, and loaded pages.
5. **Header sort:** Title, Status, Updated only. Checkbox and Actions are not sort controls. First click = natural direction (title A→Z in desk language; status = workflow order; Updated = newest first). Second click reverses. This visit only; leave / refresh / logout → default `updated_at DESC`. While a sort is active, Load more continues that order. Selected ids stay selected after sort (same items, new visual order). Reuse the existing list-sort comparators / SQL helpers where they already match.
6. **Header checkbox:** loaded rows only (not the whole type). Same as news list bulk.
7. **Bulk bar:** **Export selected** only. Disabled when nothing is checked. Confirm before download. One zip of those ids **of the current type** + referenced `img/` files. Same manifest rules as today’s export. Keep **Export this type** and per-row **Export this item**.
8. **>200 selected:** warn + confirm (“this is a large export…”). Do **not** silently truncate. If the zip is too large to build, fail with today’s sentence (export fewer / one item).
9. **Stale ids:** skip missing or recycled; if none remain, fail clearly (no empty fake zip).
10. **Visit-only state:** type, search, loaded page window, sort, and selection are in memory on this page. No `?type=` / `?page=` / `?sort=`. No `localStorage`.
11. **Unchanged:** import zip → new drafts; author restore; org fallback; audit `*.export` with counts; no notification flood; featured playlist not in the zip.
12. Type lists (News, Events, …) **do not** gain Export. Their bulk and header sort stay as today.

### Should have

1. Unit tests: selected export never publishes; skips recycled; does not drop extras above 200 (warn path); Load more + active sort; header checkbox is loaded rows only.
2. SMOKE-CMS checks on the I/E page (bulk selected, Load more + sort, type/one-item still work, lists unchanged).

### Nice to have

1. None locked.

## 5. Content / data impact

- **Export:** download only; no public JSON writes.
- **Import:** unchanged (new drafts only).
- **No** `data/*.json` or SPA locale key-count change unless a new CMS string needs a pair (CMS `labels.ts` AR+EN together).
- **No** schema migration.

## 6. UX notes

- Type select at the top (as today). Table below. Sticky bulk bar when any row is checked: count + **Export selected** + clear.
- Confirm copy names the count. Large-selection confirm is extra when N > 200.
- Per-row Export stays in Actions so one-item zip does not require using the bulk bar.
- Failures are Desk sentences, not stack traces.

## 7. Technical notes

- Extend today’s export API to accept **many ids** of one type (not a second zip format).
- Picker list API: page size 20 + optional sort key/dir (this visit; not a public URL contract). Default order `updated_at DESC`.
- Reuse zip builder, 48MB cap, recycle skip, media path collection (including `image_card_path`).
- Do not import server modules (`recycleBin` / `session`) into the I/E client.

## 8. Success metrics

- SA checks three news rows → one zip → import on the same Desk = three new drafts; `news.json` hash unchanged.
- Load more then sort Title: further pages follow that order; URL has no `sort=` or `page=`.
- Header checkbox does not select rows not yet loaded. **Export this type** still dumps the full non-recycled type.
- Editor still has no I/E. Type-list bulk/sort unchanged.
- `cms npm test` + SMOKE-CMS I/E bulk/sort checks.

## 9. Open questions

None blocking. Stakeholder locked 2026-08-24 via Q&A.

## 10. Decision log

| Date | Decision |
|------|----------|
| 2026-08-24 | Idea: bulk option on Import/Export plus bulk ops and header sort. |
| 2026-08-24 | **Where:** I/E page only. Type lists unchanged. |
| 2026-08-24 | Bulk bar = **Export selected** only (not Unpublish / Recycle / Duplicate). |
| 2026-08-24 | Keep **Export this type** and per-row **Export this item**. |
| 2026-08-24 | Picker: Load more 20; header sort continues; checkbox = loaded rows. |
| 2026-08-24 | N > 200: warn + confirm; do not silently drop extras. |
| 2026-08-24 | Columns: Title, Status, Updated. Sort those; not checkbox/Actions. |
| 2026-08-24 | Type / search / page / sort / selection are **this visit only** (no URL, no `localStorage`). Type change clears selection, sort, search, pages. Search keeps sort, resets to first 20. |
| 2026-08-24 | Stakeholder **lock**. Draft this PRD. **Do not implement until Approved.** |
| 2026-08-24 | Stakeholder **Approved**. Implement on `feature/cms-import-export-bulk-sort`. |
| 2026-08-24 | **Delivered** after Ie5–Ie8 walk (header checkbox = loaded rows; type lists unchanged). |
