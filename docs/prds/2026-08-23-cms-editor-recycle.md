# PRD: CMS Editor recycle (draft + rejected)

| Field | Value |
|-------|--------|
| Status | **Approved** (2026-08-23) |
| Date | 2026-08-23 |
| Author | Stakeholder + agent |
| Owners | Product / CMS Desk |
| Related | [2026-08-22-cms-recycle-bin.md](./2026-08-22-cms-recycle-bin.md) (SA bin); [2026-08-22-cms-news-bulk-actions.md](./2026-08-22-cms-news-bulk-actions.md) (Reviewer/SA bulk) |
| Supersedes | Recycle-bin **non-goal** “Editors or Reviewers using the bin”. SA unpublished/rejected recycle and Reviewer unpublish **stay**. Does not change clone Cut 1. |

> Editors can bin **their own drafts and rejected items**, in bulk and from the edit page, and restore them from a scoped Recycle bin. Super Admin keeps permanent delete / empty / purge. Reviewer chrome unchanged.

## 1. Problem

Editors cannot clean a dead draft or a rejected row without Super Admin. List bulk and the Recycle bin are Reviewer/SA (unpublish) and SA (bin unpublished/rejected). An Editor’s unused draft sits in the list until someone else bins it.

Who feels it: Editors (cannot throw away own unfinished or rejected work); Super Admin (desk cleanup for other people).

## 2. Goals

- Editors get list **checkboxes + Recycle** (not Unpublish) on every content type they can see.
- Editors can **Move to recycle bin** on the edit page when the item is **draft** or **rejected** and they authored it.
- Editors can open `/dashboard/recycle-bin` and see **only their own** binned rows in their content-type scopes; they can **Restore** those rows (back to draft).
- Super Admin still bins unpublished/rejected (and unpublish-then-bin published). Permanent delete, Empty bin, and 90-day purge stay **SA only**.
- Public SPA unchanged: drafts and rejected items are not live.

**Non-goals**

- Editor **Unpublish**. Published / approved stay out of Editor recycle.
- Editor recycle of **submitted**, **changes_requested**, **unpublished**, **approved**, **published**.
- Reviewer recycle chrome or Reviewer bin page (unchanged).
- Editors recycling or restoring **another Editor’s** rows, even in the same type.
- Editors seeing Empty bin, Purge, or Permanently delete.
- Schema / status-enum change; new `content_status`.
- Clone, JSON import/export, media crop, EN body parity, static pages, journals.
- Scheduled publish (cancelled).
- Notification flood.

## 3. Users & roles

| Role | Needs |
|------|--------|
| Editor | List bulk Recycle on **own** draft/rejected rows in scoped types. Edit-page Move to recycle bin on those. Bin page: own binned rows only; Restore own. No Unpublish, no permanent delete. |
| Reviewer | Unchanged: bulk Unpublish; no recycle; no bin page. |
| Super Admin | Unchanged recycle of unpublished/rejected (+ unpublish-then-bin). Full bin: Restore, Permanently delete, Empty, Purge. Also still sees Editor-binned drafts/rejected. |
| Public SPA | Unchanged. |

## 4. Requirements

### Must have

1. **Statuses (Editor):** `draft` and `rejected` only. Skip every other status (including `submitted` and `changes_requested`).
2. **Ownership:** `created_by =` the acting Editor. Other people’s rows never appear as eligible, never recycle, never show in their bin, never restore.
3. **Scope:** Same content-type (and org) access as create/list. If they cannot see the type, they cannot bin it.
4. **Lists:** All nine types that already have bulk: news, events, publications, partners, alerts, laws, platforms, research groups, research projects. Editor lists grow checkboxes + a Recycle action (reuse the bulk bar; **do not** show Unpublish to Editors).
5. **Bulk:** Confirm → skip ineligible + report → dismiss. Cap 200. No public JSON rebuild (drafts/rejected are not live). No notification flood. Audit `*.recycle` per success.
6. **Edit page:** Show **Move to recycle bin** when the viewer is the author (or SA) and status is draft or rejected (Editors). SA’s existing unpublished/rejected button stays. Confirm as today.
7. **Bin page:** Editors may open `/dashboard/recycle-bin` (nav visible). Query: `recycled_at IS NOT NULL` **and** `created_by = editor` **and** content type in their scopes. Columns stay. Per row: **Restore** only. Hide Permanently delete, Empty bin, 90-day Purge.
8. **Restore:** Same as today (status → `draft`, clear recycle fields, media stays). Editor may restore **only** rows they authored. After restore, stay on the bin page (row gone), as today for SA.
9. **SA gates unchanged:** Recycle unpublished/rejected; published = unpublish then bin; four-eyes on unpublish; Empty / Purge / permanent delete SA only. Do **not** replace the SA status set with draft/rejected.
10. **Reviewer:** No new recycle API success path. Hitting recycle still skips (`not_sa` / equivalent).
11. **Hide recycled** from Editor lists/queues as today (`recycled_at IS NULL`).
12. **i18n:** AR+EN keys in sync for Editor bulk Recycle, skip reasons (wrong status, not author), bin empty state when they have nothing binned.

### Should have

1. Skip reasons in the bulk report: not draft/rejected; not author; already binned; not found; over cap.
2. Unit tests: Editor recycle draft OK; Editor recycle submitted skipped; Editor cannot recycle another author’s draft; Reviewer recycle still skipped; SA unpublished recycle still OK; Editor bin list is own rows only; Editor restore own OK; Editor restore others skipped; Editor cannot purge/delete.

### Nice to have

1. None locked.

## 5. Content / data impact

- **None** on public `data/*.json` or SPA locales. Editor recycle does not rebuild JSON.
- **No migration.** Reuse `recycled_at` / `recycled_by` / `recycled_from_status`.
- CMS i18n only (`labels.ts`).

## 6. UX notes

- Same Desk list chrome as Reviewer/SA bulk: checkboxes, sticky bar, confirm, report.
- Editor bar: Recycle + Clear. No Unpublish.
- Bin page: one component; actions depend on role. Editor empty state: “No items in your recycle bin.”
- Restore is one click (no confirm), as today.
- RTL + `prefers-reduced-motion` as Desk.

## 7. Technical notes

- Extend `recycleContentItem` with an **additive** Editor path (own + draft/rejected + type scope). Keep `assertSuperAdmin` on permanent delete, empty, purge.
- Do not flip `isRecycleEligibleStatus` globally to draft/rejected — SA still needs unpublished/rejected. Split eligibility by role (or two helpers).
- Bulk: existing `POST /api/{type}/bulk` `action: "recycle"`. Today Editors are skipped as `not_sa`. Allow Editor recycle for eligible ids; still skip Unpublish for Editors.
- List `bulk` prop: pass for Editors with `canRecycle: true` and hide Unpublish in the bar when `role === "editor"`.
- Bin list SQL must filter by `created_by` for Editors. Nav: show Recycle bin to Editors.
- No SPA files. No new packages.

## 8. Success metrics

- Editor selects own drafts + one rejected + one submitted: submitted skipped; others binned; list updates; `news.json` (etc.) unchanged.
- Editor bin page shows only those rows; Restore returns them as drafts; they cannot Empty/Purge/delete.
- SA still bins unpublished; Reviewer still cannot recycle.
- `cms npm test` covers the Should-have cases. SMOKE-CMS Editor recycle checks pass.

## 9. Open questions

None. Clone Cut 1 PR waits (stakeholder). Import/export later.

## 10. Decision log

| Date | Decision |
|------|----------|
| 2026-08-23 | Bulk Recycle for Editors on **all scoped** list types. |
| 2026-08-23 | Bin page for Editors: **scoped own rows** only. |
| 2026-08-23 | Statuses: **draft** and **rejected** only. Submitted out. `changes_requested` out. |
| 2026-08-23 | Edit page **Move to recycle bin** for those statuses. |
| 2026-08-23 | Editors may **Restore** their own binned items. |
| 2026-08-23 | Permanent delete / Empty bin / 90-day purge: **SA only**. |
| 2026-08-23 | Cannot recycle or restore another Editor’s rows. |
| 2026-08-23 | Clone PR **wait**. Stakeholder: start implementation — treat this PRD as **Approved**. |
