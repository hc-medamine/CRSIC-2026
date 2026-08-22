# PRD: CMS news list — bulk unpublish / recycle

| Field | Value |
|-------|--------|
| Status | **Approved** (2026-08-22) |
| Date | 2026-08-22 |
| Author | Stakeholder + agent |
| Owners | Product / CMS Desk |
| Related roadmap step | Deferred backlog — bulk ops / clone / import-export UI (**this slice = news list bulk only**) |
| Related | [2026-08-22-cms-list-load-more.md](./2026-08-22-cms-list-load-more.md) (news list 20 + Load more); [2026-08-22-cms-recycle-bin.md](./2026-08-22-cms-recycle-bin.md) (SA bin, unpublished/rejected); [2026-08-22-cms-reassign-authorship-ui.md](./2026-08-22-cms-reassign-authorship-ui.md) (Desks / Align — **out**) |
| Supersedes | Nothing. Single-item Unpublish and Move to recycle bin stay on the news edit page. |

## 1. Problem

Reviewers and Super Admins take down or bin news **one row at a time**. After a bad publish wave, a festival weekend, or a desk cleanup, that is many round-trips: open item → confirm → wait for JSON rebuild → back to the list.

Who feels it: Reviewer (unpublish) and Super Admin (unpublish + recycle). Editors already cannot unpublish or bin; this slice does not change that.

## 2. Goals

- On `/dashboard/news`, Reviewer and Super Admin can **select loaded rows** and run **Unpublish** and (SA only) **Move to recycle bin** in one confirm.
- Each selected id is checked with **today’s single-item gates** (`unpublishNews` / `recycleContentItem`). No new powers.
- Ineligible rows are **skipped**; the rest proceed. The actor always gets a **per-item report** (*N done, M skipped* + reason). The batch never aborts silently.
- Public `news.json` is rebuilt **once** after a bulk unpublish (including unpublish-then-bin), not once per row.

**Non-goals**

- Events, publications, partners, alerts, laws, platforms, research groups/projects lists.
- Editors gaining unpublish or recycle.
- Clone / duplicate (follow-on PRD).
- Import / export UI or CMS item JSON dump (follow-on PRD, SA only if started).
- Spreadsheet or leftover WordPress import.
- Select-all-in-database (rows not currently loaded).
- Reassign author, move to another desk, or bulk Align (Desks page stays SSOT).
- Bulk publish / approve / reject / request-changes / withdraw.
- In-CMS notification flood (one ping per unpublished row).
- Recycle bin page bulk (Empty bin / Purge already exist).
- Scheduled publish (**cancelled** — do not reopen).
- Media crop, EN editorial body parity, static pages in CMS, journals (deferred).

## 3. Users & roles

| Role | Needs |
|------|--------|
| Super Admin | Checkboxes + bulk bar: **Unpublish**, **Move to recycle bin**. Recycle of **published** news = unpublish then bin in **one** confirm. Same four-eyes as today (cannot unpublish/bin-via-unpublish **own** authored news). |
| Reviewer | Checkboxes + bulk bar: **Unpublish** only. No recycle action (API still SA-only). Per-item publish rights: cannot unpublish own story; cannot unpublish when away-frozen; org/type access unchanged. |
| Editor | **No bulk chrome** this slice (no checkboxes, no bar). Single-item edit page unchanged. |
| Public visitor | Unpublished news drops from `news.json` and the featured playlist the same as a single unpublish. Binned unpublished/rejected news stays off the public site. |

## 4. Requirements

### Must have

1. **Surface:** `/dashboard/news` only. Opt-in on the shared list (same pattern as Load more) so other type lists do not grow checkboxes by accident.
2. **Who sees bulk:** Reviewer and Super Admin only. Editor list stays as today.
3. **Selection:** Checkbox per **currently loaded** row (first paint + rows appended by Load more). No “select all in CMS.” Header checkbox = all **on-screen** rows. Changing search/status (new filter URL) **clears** selection. Cap = on-screen count; server also rejects or skips ids beyond a hard max of **200**.
4. **Actions (existing gates, reused — do not fork policy):**
   - **Unpublish** — Reviewer or SA. Per item: same as `unpublishNews` (reviewer role, not away, four-eyes / not own, status `published`, item visible to the actor). Editors cannot. Featured playlist prune as today.
   - **Move to recycle bin** — SA only. Per item:
     - `unpublished` or `rejected` → `recycleContentItem` (as today).
     - `published` → **unpublish then recycle** in that order, still in **one** confirm modal. Unpublish uses the same four-eyes / away / role checks; recycle then uses the SA + unpublished gate.
     - Any other status (draft, submitted, approved, changes_requested) → skip.
   - Reviewer must **not** see recycle in the bulk bar. If they hit the recycle API, skip every id (`Super Admin role required`).
5. **Confirm:** One Desk dialog per chosen action: action name, count **X**, Cancel. For recycle, the copy must say that **published** rows in the selection will be **unpublished first, then moved to the bin**. No extra four-eyes prompt beyond today’s per-item rule.
6. **Partial failure:** Always continue. Never abort the whole batch because one id failed. Return `{ done: [{ id, title }], skipped: [{ id, title, reason }] }`. Surface in the UI after the request (*N unpublished / N moved to bin, M skipped*) with readable reasons (not published; own story / four-eyes; away; not found; not SA; wrong status; already binned).
7. **No extra four-eyes layer:** Bulk does **not** add a second reviewer. It **does** keep today’s per-item publish rights, including four-eyes on unpublish (Reviewer **or** SA cannot unpublish a story they authored).
8. **Public JSON:** After a bulk that unpublished at least one news item, rebuild `data/news.json` **once**. Do not call `mutateThenRebuildPublic` once per row. Recycle of already-unpublished/rejected rows does not rebuild. Featured ids: prune each unpublished/binned news id as today (playlist write can stay per id; JSON rebuild is the expensive part to coalesce).
9. **Audit:** One audit row **per item** that succeeded (`news.unpublish`, `news.recycle`, and unpublish-then-bin writes both). Skips are not required in the audit log if the UI report lists them.
10. **Notifications:** Do **not** enqueue N `news.unpublished` in-CMS notifications for a bulk unpublish. Audit + list status is the record. Single-item unpublish on the edit page keeps today’s ping.
11. **i18n:** AR+EN keys in sync for bulk bar, confirms, skip reasons, and the result report.
12. **Edit page:** Unchanged. Single Unpublish / Move to recycle bin remain.

### Should have

1. Sticky bulk bar when 1+ rows are selected (count + actions + clear).
2. Disable the action button when the current selection is empty.
3. Unit tests: Editor cannot call bulk; Reviewer recycle skipped; own published skipped; mixed recycle (published + unpublished) for SA; one rebuild after N unpublishes; skip report shape.

### Nice to have

1. Confirm dialog lists titles (or “and N more”) — **out** if it fights the Desk modal; count + action is enough.
2. Undo toast — **out**.

## 5. Content / data impact

| Surface | Change |
|---------|--------|
| `data/news.json` | Same contract as single unpublish; **one** rebuild per bulk unpublish batch |
| `data/featured-news.json` | Drop unpublished/binned ids (same as today) |
| Other `data/*.json` / locales / SPA JS | **None** |
| CMS schema | **None** (reuse `status`, recycle columns) |
| CMS labels | Bulk strings AR+EN |

## 6. UX notes

- Checkboxes sit on the news list rows Reviewer/SA already see. Row click still opens the item; checkbox click does not navigate.
- Bulk bar appears only with a selection. Actions the role cannot run are absent (not disabled-with-mystery).
- Unpublish confirm: taking **X** stories off the public site; Cancel.
- Recycle confirm (SA): moving **X** to the recycle bin; **Y** of them are published and will be unpublished first; Cancel. Restore from the Recycle bin is still SA, one-by-one, as today.
- After the request: stay on `/dashboard/news`; selected rows that succeeded disappear or update status; show the skip report until dismissed.
- Empty / filtered list: no bulk bar.
- **Visual:** a natural extension of existing CMS list pages — same row styling, same native checkbox, same sticky action-bar placement (`FormStickyActions`), same Desk modal (`cms-modal-backdrop` / `cms-modal-panel`), same Tailwind Desk palette (`crs-*`). Flow is deterministic: **select → bar → confirm → report → dismiss**. Do not invent a new list chrome.

## 7. Technical notes

- Reuse `unpublishNews` / `recycleContentItem` **policy** (or extract the gate to a shared helper used by both single and bulk). Do not implement a second, looser pipeline.
- Split **mutate** from **rebuild** for the bulk path so N unpublishes are one `rebuildPublicNewsJson`.
- Next.js App Router; `searchParams` as `Promise`. Read `cms/node_modules/next/dist/docs/` before coding.
- Suggested API: `POST` news bulk with `{ action: "unpublish" \| "recycle", ids: string[] }`, session cookie, same CSRF/session rules as other mutations. Validate each id is `content_type = news` and `recycled_at IS NULL` before acting.
- Away freeze: `assertNotAwayFrozen` per item (same as single unpublish).
- No public SPA files. No email. No cron.

## 8. Success metrics

- Reviewer: select several published news (not own) → Unpublish → they leave `news.json` after **one** rebuild; own published in the same selection is skipped with a four-eyes reason; recycle control is absent.
- SA: mixed selection (published + unpublished) → Recycle → one confirm → published rows unpublished then binned; unpublished/rejected binned; drafts skipped; report lists each skip.
- Editor: no checkboxes; existing bulk API returns skip/403 for every id.
- Public site: unpublished stories gone; featured playlist no longer shows them.
- Single-item Unpublish / Move to recycle bin on the edit page still work.

## 9. Open questions

- None blocking. Clone and import/export wait for their own PRDs. Events/publications bulk is a later slice after this ships.

## 10. Decision log

| Date | Decision |
|------|----------|
| 2026-08-22 | This PRD = **news list bulk only**. Clone and import/export are **follow-on PRDs**, not this slice. |
| 2026-08-22 | **Keep today’s gates.** Bulk reuses existing role checks. Editors do not unpublish or recycle. |
| 2026-08-22 | Unpublish: Reviewer or SA, four-eyes (not own), published only, away freeze. Recycle: SA, unpublished/rejected. |
| 2026-08-22 | **Bulk recycle of published news:** unpublish-then-bin in **one** confirm. Reviewer still cannot recycle (bar + API). |
| 2026-08-22 | Reviewer + own story: **no extra** four-eyes layer; bulk **respects per-item publish rights** (existing four-eyes still skips own). |
| 2026-08-22 | Partial failure: **always skip ineligible**; never abort the whole batch without a **per-item report**. |
| 2026-08-22 | Select loaded rows only (Load more pages count). No select-all-in-database. Server max 200 ids. |
| 2026-08-22 | Author reassign / desk move **out**. Desks/Align stay on the Desks page. |
| 2026-08-22 | No N in-CMS unpublish pings on bulk. Audit per successful item. One `news.json` rebuild per bulk unpublish. |
| 2026-08-22 | Import = later PRD, SA, CMS item JSON → drafts only (never auto-publish, never write SPA `data/*.json` from import). Recorded here so it is not smuggled into this slice. |
| 2026-08-22 | **Approved.** Visual lock: reuse list row, checkbox, sticky bar, Desk modal, Tailwind `crs-*` palette. Flow: select → bar → confirm → report → dismiss. |
