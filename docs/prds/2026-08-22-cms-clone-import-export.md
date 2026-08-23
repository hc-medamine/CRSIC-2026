# PRD: CMS clone + JSON import/export

| Field | Value |
|-------|--------|
| Status | **Draft** (2026-08-22) |
| Date | 2026-08-22 |
| Author | Stakeholder + agent |
| Owners | Product / CMS Desk |
| Related roadmap step | Deferred backlog #1 after list bulk — clone / import-export UI |
| Related | [2026-08-22-cms-news-bulk-actions.md](./2026-08-22-cms-news-bulk-actions.md); remaining-types bulk (PR #37) |
| Supersedes | Nothing. Edit-page create/save and WP cutover scripts stay. |

## 1. Problem

Repeating a news story, event, or research row means re-typing it. There is no Duplicate in the Desk. Moving a draft between machines or taking a JSON backup still needs ops scripts, not a CMS action.

Who feels it: Editors (repeat programmes, similar announcements), Reviewers/SA (desk cleanup and handover).

## 2. Goals

- **Cut 1 — Clone:** Anyone who can **create** that content type can duplicate a visible item into a **new draft**, from the edit page and from the list.
- **Later cuts — JSON round-trip:** Export one item or one type as JSON; import creates **drafts** only (no auto-publish). No WordPress scrape UI (cutover scripts remain ops).

**Non-goals (this PRD)**

- Copying or duplicating media files (clone leaves cover/attachments/og empty).
- Clone from Recycle bin.
- Import that publishes, submits, or overwrites live public JSON by itself.
- WordPress / `crsic.dz` scrape in the CMS UI.
- Media crop, EN body parity, static institutional pages, journals (other deferred items).
- Scheduled publish (cancelled).

## 3. Users & roles

| Role | Cut 1 (clone) |
|------|----------------|
| Anyone who can create that type | Edit-page **Duplicate**. List **per-row Duplicate**. |
| Reviewer + Super Admin | The above, plus **bulk Duplicate** on the existing list checkboxes / bulk bar (Editors still have no Unpublish/Recycle chrome). |
| Editor | No new Unpublish/Recycle checkboxes. Clone is one-at-a-time except where they already have list checkboxes (they do not today). |
| Public SPA | Unchanged until a cloned draft is published through the normal workflow. |

## 4. Requirements

### Must have (cut 1)

1. **Surfaces:** Duplicate on the item edit page; Duplicate on each list row; bulk Duplicate in the list bar where checkboxes already exist. All CMS list types: news, events, publications, partners, alerts, laws, platforms, research groups, research projects.
2. **Who:** Same gate as **create** for that type (not “SA only”). Four-eyes on the **new** row: cloner is author and cannot approve/publish their own duplicate.
3. **Result:** Always a **new draft** (`status = draft`). Never published, never submitted, no `live_payload`. New `id`. New `public_slug` (resolved unique from the new title).
4. **Fields:** Copy all editorial fields (AR/EN titles and bodies, summaries, labels, SEO, dates, type-specific fields such as partner scope, research members, group link, external URLs). **Blank media:** `image_path`, `og_image`, attachments/media arrays empty.
5. **Title:** Append a visible suffix: Arabic ` (نسخة)` and English ` (copy)` when an EN title exists. List must distinguish source vs duplicate.
6. **Do not copy:** comments, revisions, workflow history, recycle metadata, featured-playlist membership, in-CMS notifications, publisher assignment (clear `publisher_id`).
7. **Bulk clone:** Max **200** ids (same cap as list bulk). Skip ineligible + per-item report. No notification flood. No public JSON rebuild (drafts are not live).
8. **Alerts:** Clone is a draft; one-live-alert exclusivity stays on **publish**.
9. **i18n:** AR+EN keys in sync for Duplicate, confirms, skip reasons, report.
10. **Audit:** one `*.clone` (or equivalent) per successful item; actor = logged-in user.

### Should have (later cuts, same PRD)

1. **Export:** JSON for one item or one type (paths to media, not a zip of binaries in cut 1 of export — open question).
2. **Import:** JSON → **drafts** only. Skip + report. No auto-publish, no N notifications.

### Nice to have

1. After clone, land on the new draft’s edit page (single clone). After bulk clone, stay on the list and show the report.

## 5. Content / data impact

Cut 1 does **not** write `data/*.json`. Public files change only when someone later publishes a clone through the existing pipeline (publications must still keep `covers.length === pubs.length` on that publish).

Later import/export must not bypass sanitize/allowlists or four-eyes.

## 6. UX notes

- Desk-native: same list chrome, sticky bar, confirm → report → dismiss as bulk unpublish.
- Row Duplicate does not navigate as a row click; it clones (confirm if needed) then optional jump to the new draft.
- Empty / filtered list: no bulk Duplicate.
- Recycle bin page: no Duplicate.

## 7. Technical notes

- Prefer a shared `cloneContentItem` used by edit action, row action, and bulk API. Validate `content_type` and `recycled_at IS NULL`.
- Suggested bulk API shape: `POST /api/{type}/bulk` with `action: "clone"` **or** a dedicated clone endpoint if mixing with unpublish/recycle is messy. Do not loosen unpublish gates.
- No SPA files. Next.js App Router; `searchParams`/`params` as `Promise`.

## 8. Success metrics

- Editor can duplicate a news item they can create; result is a draft with suffix, empty media, copied body, new slug; they cannot publish it themselves (four-eyes).
- Reviewer bulk-clones mixed rows; ineligible skipped; no `news.json` change; featured playlist unchanged.
- `npm test` covers: always draft; media blank; suffix; skip recycled; editor without create is skipped; bulk cap 200.
- SMOKE-CMS clone checks (Cl1–Cln) pass.

## 9. Open questions

- Export later: JSON-only vs zip that includes media bytes.
- Export later: who may export a whole type (create-can vs Reviewer vs SA).
- Import later: update-if-id-exists vs always new ids (default unless locked: **always new ids**).

## 10. Decision log

| Date | Decision |
|------|----------|
| 2026-08-22 | One PRD = clone **and** JSON import/export. **Cut 1 = clone only.** |
| 2026-08-22 | Clone from **edit page + list row**; bulk Duplicate only where list checkboxes already exist (Reviewer+SA). Editors do not gain Unpublish chrome. |
| 2026-08-22 | Who: anyone who can **create** that type. |
| 2026-08-22 | Always **new draft**. Empty media. Copy all editorial fields. Title suffix ` (نسخة)` / ` (copy)`. |
| 2026-08-22 | All nine list types in cut 1. |
| 2026-08-22 | Later cuts: JSON export one item or one type; import as drafts; no WP UI. |
| 2026-08-22 | Defaults: no comments/revisions/live JSON/featured copy; cloner = author; publisher cleared; bin has no clone; bulk max 200; no notify flood. |
