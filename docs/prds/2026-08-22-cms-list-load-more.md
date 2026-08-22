# PRD: CMS news / events / publications — Load more

| Field | Value |
|-------|--------|
| Status | **Delivered** (2026-08-22) |
| Date | 2026-08-22 |
| Author | Stakeholder + agent |
| Owners | Product / CMS Desk |
| Related roadmap step | Deferred backlog — server list pagination (~200-row trigger); **starting now** (inventory still below 200) |
| Related | [2026-08-20-cms-desk-interiors.md](./2026-08-20-cms-desk-interiors.md) (shared `ContentListPage`, “showing N”); [2026-08-22-cms-reassign-authorship-ui.md](./2026-08-22-cms-reassign-authorship-ui.md) (Desks — out of scope here) |
| Supersedes | Desk interiors non-goal “no pagination” **for news, events, and publications lists only** |

## 1. Problem

CMS Desk news, events, and publications lists are **server-rendered unpaged**: they load every row the signed-in user may see, then filter search/status in memory. That is fine at ~39 / 55 / 36 items and will not stay fine as the catalogue grows. The public SPA is not part of this problem.

Who feels it: Super Admin, Reviewer, and Editor on `/dashboard/news`, `/dashboard/events`, `/dashboard/publications`.

## 2. Goals

- Those three lists load **20 rows at a time**, with **Load more** appending the next page.
- A shared URL with `?page=3` shows **pages 1–3** on first paint (up to 60 rows), not only rows 41–60.
- Search and status stay in the URL; changing filters returns to **page 1**.
- Existing links **without** `page` keep working (`page=1`).
- Public site and other CMS lists are unchanged.

**Non-goals**

- Public SPA lists, Home carousels, `data/*.json`.
- Partners, laws, platforms, alerts, research groups/projects lists (stay full-fetch).
- Media library, audit log, notifications, users, Home queues (existing caps / honesty stay).
- Numbered page links, infinite scroll, or a new `/api/lists` aggregator.
- Recycle bin, scheduled publish, bulk ops, media crop, EN body parity, journals (deferred).

## 3. Users & roles

| Role | Needs |
|------|--------|
| Super Admin / Reviewer / Editor | Same visibility as today (SA all; Reviewer claimed orgs; Editor own items). Paging must not leak extra rows. |
| Keyboard / screen reader | Load more is a real button; skeleton is not announced as data rows. |
| Anyone with an old `/dashboard/news` bookmark | Works with no `page` param (first 20 + Load more if `hasMore`). |

## 4. Requirements

### Must have

1. **Surfaces:** `/dashboard/news`, `/dashboard/events`, `/dashboard/publications` only. Shared `ContentListPage` grows Load more as an **opt-in** so partners/laws/etc. cannot get the button by accident.
2. **Page size:** **20**, configured in each list-fetch function (`listNewsForUser`, `listEventsForUser`, `listPublicationsForUser`). Client does **not** send `pageSize`.
3. **URL:** `q`, `status`, and `page` are search params. Omit `page` or invalid/`<1` → **`page=1`**. Filter Apply (existing GET form: `q` + `status` only) **drops** `page` → reset to 1. Load more **appends** rows and updates `page` in the URL **without** dropping `q`/`status`.
4. **`?page=N` first paint:** render **pages 1–N** (up to `N × 20` rows) in current `updated_at DESC` order. Shared links depend on this. Load more then fetches **only** page `N+1` and appends.
5. **API:** `GET /api/news?page=2` (same for `/api/events`, `/api/publications`). Same role filters as the list functions. Also accept `q` and `status` (same meaning as today’s in-memory filter: title AR/EN + status; status exact). Omit `page` → **page 1** (not a full dump, not 400).
6. **Response:** `{ ok, items, hasMore, page }`. `hasMore` from `LIMIT 21` (page size + 1), trim to 20; no extra `COUNT(*)`. Load more **hides** when `!hasMore`.
7. **SSR vs Load more:** Document load with `page=N` uses the list function for the first `N × 20` rows + `hasMore`. Load more calls `GET ...?page=N+1&q=&status=` and **appends** (dedupe by `id` if a row moved).
8. **Skeleton:** while fetching the next page, **4** placeholder rows (allowed range 3–5) under the table using existing `cms-skeleton`. Not a full-page `loading.tsx` reload. Reuse that look.
9. **Footer:** keep **“showing N”** for rows on screen. No “N of M”. Truncation hint used on media/audit is **not** used here; Load more / hidden button is the honesty.
10. **i18n:** AR+EN keys in sync for Load more + loading state (`cms/src/lib/i18n/labels.ts`).
11. **POST create** on `/api/news` | events | publications **unchanged**.

### Should have

1. Cap `page` at **100** (max 2000 rows via this UI) so a huge `OFFSET` cannot be used as a scrape.
2. Shared pagination helper for OFFSET/LIMIT + `hasMore` so the three fetch functions do not drift; page size still declared in each function.
3. Unit tests for page clamp, `hasMore` (`LIMIT 21`), and “pages 1–N” window size.

### Nice to have

1. After Load more, do not jump scroll to top; new rows stay below the fold.

## 5. Content / data impact

| Surface | Change |
|---------|--------|
| `data/*.json` / public SPA | **None** |
| CMS locales (`labels.ts`) | Load more / loading strings (AR+EN) |
| `CONTENT_BASE_URL` | None |
| Schema / migrations | **None** |

## 6. UX notes

- Empty list and filtered-empty (clear filters) stay as today.
- If `hasMore` is false on page 1 (≤20 matches), no Load more button — same as a short catalogue today.
- Direct visit `/dashboard/news?page=3&status=published` shows up to 60 published rows, then Load more if more exist.
- Filters remain the current search + status toolbar (GET form).

## 7. Technical notes

- Lists today: RSC calls `list*ForUser` (no `LIMIT`), then `filterContentItems`. This slice moves **filter + page** into the fetch (SQL or filtered-then-slice must match URL `q`/`status` on **every** page, not filter after a single unpaged fetch).
- Existing `GET /api/news` (and events/publications) currently returns the full list and is **not** used by the Desk list (SSR). This slice changes that GET to paged `{ items, hasMore, page }`. Forms keep POST. Desk bookmarks without `page` stay valid.
- Next.js App Router; `params` / `searchParams` as `Promise` per current `cms/` patterns. Read `cms/node_modules/next/dist/docs/` before coding.
- No `innerHTML`. No public SPA files.

## 8. Success metrics

- News / events / publications: first paint ≤20 rows unless `page>1`; `page=3` shows ≤60; Load more appends 20 or fewer and hides at the end.
- Partner (and other out-of-scope) lists still return the full allowed set with no Load more.
- Public `#news` / `#events` / `#publications` unchanged.
- CMS unit tests for pagination helpers pass; smoke: filters reset to page 1; shared `?page=3` link; Editor does not see others’ rows.

## 9. Open questions

- None blocking. Remaining deferred backlog is unchanged (recycle bin next after this slice is Delivered).

## 10. Decision log

| Date | Decision |
|------|----------|
| 2026-08-22 | CMS only. Load more on news / events / publications. No public SPA. |
| 2026-08-22 | API: `GET /api/news?page=2` (same for events, publications). Same role filters. Server-side pages. |
| 2026-08-22 | Page size **20** in each list-fetch function. Client does not send `pageSize`. |
| 2026-08-22 | `page` in URL/search params; `hasMore` boolean; 3–5 skeleton rows (lock **4**) under the table; `cms-skeleton`. |
| 2026-08-22 | Load more appends; hides when `!hasMore`. |
| 2026-08-22 | `q` / `status` in URL; filter change → `page=1`. |
| 2026-08-22 | Partners / laws / platforms / alerts / research stay full-list. |
| 2026-08-22 | `?page=3` = render pages **1–3** on first paint (shared-link usability). |
| 2026-08-22 | No `page` param → `page=1` (old URLs work; GET is not a 400). |
| 2026-08-22 | Footer “showing N” only; `hasMore` via `LIMIT 21`; Load more opt-in on shared list; cap `page` at 100. |
| 2026-08-22 | **Approved.** |
| 2026-08-22 | **Delivered** on `main` (`feature/cms-list-load-more`). Full-width Desk Load more row. |
