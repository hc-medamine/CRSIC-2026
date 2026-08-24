# PRD: CMS table header sort

| Field | Value |
|-------|--------|
| Status | **Approved** |
| Date | 2026-08-24 |
| Author | Stakeholder + agent |
| Owners | Product / CMS Desk |
| Related | [2026-08-20-cms-desk-interiors.md](./2026-08-20-cms-desk-interiors.md) (list chrome); [2026-08-22-cms-list-load-more.md](./2026-08-22-cms-list-load-more.md) |
| Supersedes | Nothing. Default list order (updated newest first) stays until the user sorts. |

> Clicking a **data column header** on a CMS `<table>` sorts the rows by that column. Sort lasts **this page visit only**. Checkbox and Actions headers stay as they are.

## 1. Problem

Desk lists always show last-updated first. Finding a title, a status, or an editor in a long table means scanning. Headers look like labels, not controls.

Who feels it: Editors, Reviewers, Super Admin on every list they use.

## 2. Goals

- Every in-scope CMS table lets the user sort by any **data** column from its header.
- Sort is honest on Load more lists (news / events / publications): further pages follow the same order.
- Leave, refresh, or log out → default order again. No URL, no saved preference.

**Non-goals**

- Sorting checkbox or Actions columns.
- Revision-history compare table (field-by-field, not a record list).
- Surfaces that are not `<table>`s: audit log, media library, notifications, desks, featured-news playlist.
- Turning those surfaces into tables.
- Persisting sort in the URL, `localStorage`, or across pages.
- Changing stored org-unit `sort_order` or any other database order used by the public site.
- Public SPA lists / carousels.
- JSON import/export, media crop, EN body parity, static pages, journals.
- Scheduled publish (cancelled).

## 3. Users & roles

| Role | Needs |
|------|--------|
| Editor / Reviewer / Super Admin | Same sort chrome on every table they can already see. No new permission. |
| Public SPA | Unchanged. |

## 4. Requirements

### Must have

1. **Tables in scope**
   - Nine content lists (news, events, publications, partners, alerts, laws, platforms, research groups, research projects): Title, Status, EN, Updated.
   - Recycle bin: Title, Type, Status, Binned at.
   - Users: User, Role, Access, Status.
   - Org units: Name, Kind, Sort (the numeric nav-order **display**).
   - Home “content by editor” matrix: editor name, each status-count column, Total.
2. **Not sortable:** checkbox (select all stays), Actions (Duplicate / Restore / etc.).
3. **Click:** first click uses the natural direction (text A→Z in the desk language; dates/times newest first; counts high→low). Second click reverses. Active header shows a small arrow. No Sort menu, no Reset button.
4. **Memory:** in-memory on that page only. Navigate away, refresh, or logout restores the table’s default. Search / status filters **on the same list** keep the current sort and re-apply it to the filtered rows.
5. **Load more:** while a sort is active on news / events / publications, Load more continues that order for the rest of the set. Default remains `updated_at DESC` when no sort is active.
6. **Org units “Sort”:** header click reorders the **view** by that number. It must not write `sort_order`.
7. **Bulk:** selected row ids stay selected after sort (same items, new visual order).
8. **Comparators:** titles / names / access text follow the UI language (`ar` when the desk is Arabic). Status follows workflow order (draft → submitted → changes_requested → approved → published → unpublished → rejected), not the alphabet. Type follows the localized type label. Dates are chronological. Counts are numeric.
9. **A11y:** header control is a `<button>` inside `<th>`, with `aria-sort`. Keyboard (Enter / Space). RTL: arrow stays with the label.
10. **i18n:** AR+EN keys in sync for sort-related `aria-label`s (and any visible hint if one is added).

### Should have

1. Unit tests for comparators (Arabic title, status workflow, date, count) and for “Load more uses active sort”.
2. SMOKE-CMS checks: content list header sort + Load more; recycle bin; one admin table; leave page → default.

### Nice to have

1. None locked.

## 5. Content / data impact

- **None** on public `data/*.json` or SPA locales.
- **No migration.** View-only reorder.
- CMS i18n only (`labels.ts`).

## 6. UX notes

- Same pattern on every in-scope table. Unsorted default looks as today (no arrow). After a click, one arrow on the active header.
- Do not change row click-through, Duplicate, Recycle, or select-all.
- `prefers-reduced-motion`: no extra motion required; skip animated row shuffle if any is added.
- Honesty count / Load more copy unchanged except that loaded rows follow the active sort.

## 7. Technical notes

- Prefer one shared header-sort helper used by `ContentListPage`, recycle bin, users, org units, and Home stats.
- Content lists with Load more: pass the active sort into the existing list API (`ORDER BY` / equivalent). Do **not** add `?sort=` to the page URL.
- Full-fetch tables (partners, bin, users, …) may sort client-side on the already-loaded set.
- No SPA files. No new packages.

## 8. Success metrics

- Click Title on news: A→Z (AR); Load more still follows that order; refresh returns newest-updated first.
- Click Status / EN / Updated: rows reorder; Duplicate and checkboxes still work; selected ids remain.
- Recycle bin, users, org units, Home editor matrix: data headers sort; Actions / checkbox do not.
- Revision history and audit/media/notifications/desks/featured: unchanged.
- Public JSON hashes unchanged. `cms npm test` + SMOKE-CMS sort checks pass.

## 9. Open questions

None. Stakeholder locked 2026-08-24. **Approved** 2026-08-24 — implement.

## 10. Decision log

| Date | Decision |
|------|----------|
| 2026-08-24 | Idea: click table header titles to sort by that column. |
| 2026-08-24 | **All** CMS `<table>`s. **All** data columns. Memory: **this visit only**. |
| 2026-08-24 | Checkbox + Actions headers are not sort controls. |
| 2026-08-24 | Exclude revision-history compare table. |
| 2026-08-24 | Exclude non-tables (audit, media, notifications, desks, featured playlist). |
| 2026-08-24 | Load more keeps the active sort for the rest of the set while the page stays open. |
| 2026-08-24 | Org-units Sort column reorders the view only. |
| 2026-08-24 | Selected ids survive sort. Titles follow desk language; status is workflow order; dates/counts numeric. |
| 2026-08-24 | First click = natural direction; second = reverse; no Reset; no URL. Stakeholder **lock** → Draft PRD. |
| 2026-08-24 | Stakeholder **Approved**. Implement as specified. |
