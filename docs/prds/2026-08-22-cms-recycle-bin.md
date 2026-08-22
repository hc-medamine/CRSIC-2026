# PRD: CMS Recycle bin (soft-delete)

| Field | Value |
|-------|--------|
| Status | **Delivered** (2026-08-22) — `main` PR #34 |
| Date | 2026-08-22 |
| Author | Stakeholder + agent |
| Owners | Product / CMS Desk |
| Related roadmap step | Deferred backlog — soft-delete recycle bin (on top of shipped hard-delete + media ref scan) |
| Related | [docs/designs/2026-07-26-media-delete.md](../designs/2026-07-26-media-delete.md) (library DELETE blocked while durable refs exist); [2026-07-19-internal-content-management.md](./2026-07-19-internal-content-management.md) (SA hard-delete unpublished/rejected) |
| Supersedes | Item-page **Delete permanently** as the first action (that becomes **Move to recycle bin**; hard-delete lives in the bin) |

## 1. Problem

Super Admin **hard-deletes** unpublished or rejected items from the edit page. There is no undo. Media files are left on disk until someone deletes them from the library (ref scan then allows it). Accidental delete of a long article or law is permanent.

Who feels it: Super Admin (no safety net); Editors (work disappears with no restore).

## 2. Goals

- SA **bins** unpublished/rejected items instead of destroying them on the edit page.
- SA can **Restore** (back to draft, media still attached) or **permanently delete** from a Recycle bin page.
- After 90 days in the bin, opening the bin shows a **banner + Purge** (no cron).
- Permanent delete removes the row **and** unreferenced media files.
- Public SPA and non-SA roles never see binned items.

**Non-goals**

- Right-click / context menus.
- Binning drafts, submitted, approved, or **published** items (unpublish first, as today).
- Editors or Reviewers using the bin (no nav, no API).
- Bin search/filters, dashboard “X in bin” badge, in-CMS notifications, email/SMTP.
- A new `content_status` value (`deleted`).
- Media-library recycle bin (library DELETE rules stay; content bin is the new surface).
- Cron / scheduled jobs.
- Scheduled publish (**cancelled** 2026-08-22 — do not reopen). Bulk clone, media crop, EN body parity, journals (deferred).

## 3. Users & roles

| Role | Needs |
|------|--------|
| Super Admin | Move to bin from the item; Recycle bin page; Restore; per-row permanent delete; Empty bin; Purge stale (>90 days) |
| Editor / Reviewer | Unchanged: no delete, no bin. Binned items disappear from their lists and queues |
| Public visitor | Unchanged (binned items were already unpublished/rejected, not in live JSON) |

## 4. Requirements

### Must have

1. **Gate (unchanged set):** Super Admin only. Item status **unpublished** or **rejected**. All types that already support hard-delete: news, events, publications, partners, alerts, laws, platforms, research groups, research projects.
2. **Move to recycle bin:** On the edit page, replace **Delete permanently** with **Move to recycle bin**. No right-click. Sets `recycled_at` + `recycled_by`; stores **original status** for the bin list. Does **not** `DELETE` the row. Clears any live payload if still present (should already be null).
3. **Hide everywhere else:** Lists, filters, queues, Align, featured-news picker, previews of CMS lists: `recycled_at IS NULL`. Status enum unchanged (`draft` … `rejected`).
4. **Recycle bin page:** `/dashboard/recycle-bin`, SA only (other roles redirect). Columns: title, type, original status (draft is not in the gate; show **unpublished** or **rejected**), date binned. Per row: **Restore**, **Permanently delete**. Page actions: **Empty bin**. Plain list (no search/filters this slice). Honesty “showing N” is enough; no Load more required at current volume.
5. **Restore (per row):** One click. Status → **`draft`** for every type. Clear recycle fields. Media stays on the item. Revisions kept. Item returns to the normal draft list for its type. No confirm required.
6. **Permanently delete (per row):** Typed/confirm dialog: this cannot be undone; item **and** its media (if unreferenced) will be removed. Then today’s hard-delete (`DELETE` row; revisions/comments/preview tokens cascade) **plus** delete media files that have **no remaining durable refs** (other items, other revisions). Same ref scan as the media library.
7. **Empty bin:** Confirm: permanently delete **X** items and their unreferenced media. Cancel button. Then purge every recycled row as in (6).
8. **90 days, no cron:** When SA **opens** the Recycle bin, items with `recycled_at` older than 90 days are listed under a banner: they are older than 90 days; **Purge** removes them now. Purge uses the same confirm as permanent delete (count = stale rows only), not a modal on every visit with no context. Empty bin remains “everything.”
9. **Media while binned:** Item still references the files → library DELETE stays **blocked** (orphan-protected). Restore stays safe. Cleanup happens only on permanent delete / empty / purge when refs are gone.
10. **Audit:** `*.recycle`, `*.restore`, `*.delete` (permanent) with actor, title, original status. Empty/purge can be one audit per item or a summary + per-item; per-item is enough.
11. **i18n:** AR+EN keys in sync for bin nav, actions, confirms, 90-day banner.
12. **Public JSON:** No rebuild required on bin (item was not live). Permanent delete of something that was already unpublished does not rewrite JSON. Featured playlist: drop a binned news id if it were still listed (same as unpublish).

### Should have

1. Confirm copy names the **title** on per-row permanent delete.
2. After Restore, redirect to the item’s draft edit page (or stay in the bin with the row gone — **stay in the bin** is simpler; do that).
3. Unit tests: gate (wrong role / wrong status); hide recycled from list SQL; restore → draft; permanent delete removes unreferenced media only.

### Nice to have

1. Subtle undo toast after Restore — **out** (not required).
2. Bin Load more if the list ever grows large — **out** this slice.

## 5. Content / data impact

| Surface | Change |
|---------|--------|
| `data/*.json` / public SPA | **None** (binned items are not published) |
| CMS schema | `content_items.recycled_at`, `recycled_by`, `recycled_from_status` (names may vary; nullable) |
| Media files | Deleted from disk **only** on permanent purge when ref scan is empty |
| CMS labels | Bin strings AR+EN |
| Migrations | New `cms/sql/03x_recycle_bin.sql` |

## 6. UX notes

- Edit page: destructive action is **Move to recycle bin** (not red “Delete permanently”).
- Bin is an Admin nav item, SA only.
- Restore: one click, row disappears from the bin.
- Permanent delete / Empty / Purge stale: dialog with Cancel; permanent delete states it cannot be undone.
- 90-day banner is **visible on load**, not an automatic delete. SA clicks Purge.
- Empty states: “Recycle bin is empty.”

## 7. Technical notes

- Prefer **`recycled_at` flag** over a new `content_status` so existing filters/workflows stay valid.
- `deleteContentItem` today: SA + unpublished/rejected + `DELETE FROM content_items`. This slice splits: recycle update vs hard-delete used only from the bin.
- Media: reuse `listMediaReferences`; do not invent force-delete in the library.
- No cron: 90-day check is **request-time** on `GET` recycle-bin page (and its API). Do not delete until Purge is confirmed.
- Next.js App Router; `searchParams` as `Promise`. Read `cms/node_modules/next/dist/docs/` before coding.
- No public SPA files. No email.

## 8. Success metrics

- SA on unpublished/rejected: Move to bin; item gone from type list; appears in Recycle bin; Restore → draft with media; edit page works.
- Editor/Reviewer: no Recycle bin nav; cannot call recycle APIs.
- Permanent delete / Empty / Purge: row gone; unused `img/cms/` (or cover) file gone; file still used by another item stays.
- Opening the bin never deletes by itself.
- Public site unchanged.

## 9. Open questions

- None blocking. Notifications, bin filters, dashboard badge, and cron stay deferred.

## 10. Decision log

| Date | Decision |
|------|----------|
| 2026-08-22 | CMS only. SA Recycle bin. Replace edit-page hard-delete with Move to bin. |
| 2026-08-22 | Gate: unpublished/rejected only. Restore **always → draft** (safe for all current types). |
| 2026-08-22 | All types that already hard-delete: news, events, publications, partners, alerts, laws, platforms, research groups/projects. |
| 2026-08-22 | `recycled_at` (not a new status). No right-click. |
| 2026-08-22 | 90 days: **no cron**. On bin open, banner + **Purge** for stale rows (not an auto-modal that deletes). |
| 2026-08-22 | Media stays referenced in the bin (library DELETE blocked). Permanent delete then removes unreferenced files. |
| 2026-08-22 | Restore: one click. Permanent delete: typed/confirm, cannot undo. Empty bin: confirm with count + Cancel. |
| 2026-08-22 | Audit on recycle/restore/delete. No notifications, no bin search, no dashboard badge this slice. |
| 2026-08-22 | **Approved.** |
| 2026-08-22 | **Delivered** on `main` (PR #34). |
| 2026-08-22 | Scheduled publish **cancelled** (removed from deferred backlog; do not reopen). |
