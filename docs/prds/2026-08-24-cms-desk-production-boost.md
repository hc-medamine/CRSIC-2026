# PRD: CMS Desk production boost (JSON zip + crop/variants + EN when ready)

| Field | Value |
|-------|--------|
| Status | **Approved** (2026-08-24) |
| Date | 2026-08-24 |
| Author | Stakeholder + agent |
| Owners | Product / CMS Desk |
| Related | [2026-08-22-cms-clone-import-export.md](./2026-08-22-cms-clone-import-export.md) (Cut 1 clone stays; later I/E cuts move here); [2026-07-22-cms-authoring-quality-pack.md](./2026-07-22-cms-authoring-quality-pack.md) (EN queue D1); [audits/PARITY.md](../audits/PARITY.md) |
| Supersedes | Later cuts (JSON import/export) of [2026-08-22-cms-clone-import-export.md](./2026-08-22-cms-clone-import-export.md). Clone Cut 1 on `main` is unchanged. |

> One PRD for the leftover **production** work: Super Admin can move a type or an item between machines as a **zip** (JSON + files → new drafts). Editors crop the cover they already upload and get a card-sized variant. English visitors see EN story bodies **when marked ready**; otherwise today’s Arabic + notice. **One build, one walk** after this PRD is Approved.

## 1. Problem

The Desk still loses time on three leftover jobs:

1. **Move / backup** still needs ops scripts. Duplicate exists; there is no honest round-trip of an item or a type **with its files**.
2. **Covers** go up as-is. Cards and detail share one uncropped file.
3. **English visitors** still get Arabic news/event/publication/partner bodies + a notice, even when EN fields are filled (`en_status` ready is invisible on the public site).

Who feels it: Super Admin (backup/handover); Editors (images + filling EN); Reviewers (EN still a publish); English visitors (stories).

## 2. Goals

- Super Admin can **export** one item or one content type as a zip (CMS items + original media files) and **import** that zip into **new drafts** only. Live `data/*.json` does not change until four-eyes publish.
- On the edit form primary/cover image: **crop**, then keep a **master** (detail) and a **card** variant. SPA cards prefer the card file.
- Public EN for **news, events, publications, partners**: if the item is EN-ready, show EN fields with per-field Arabic fallback and **no** locale notice. If not ready, keep today’s Arabic + notice. **No invented translations.**
- Intuitive: Import/Export is one Super Admin page (like Recycle bin). Crop sits on the cover they already upload. EN uses the ready flag they already have.

**Non-goals**

- Static institutional pages in CMS (About etc. stay locales).
- Journals in CMS (OJS stays source of truth).
- Scheduled publish (cancelled).
- WordPress / `crsic.dz` scrape UI (cutover scripts stay ops).
- Import that publishes, submits, or overwrites live public JSON.
- Whole-Desk zip (all types in one archive).
- Import/export for Editors or Reviewers (they keep **Duplicate** only).
- Import/export buttons on lists or edit pages (page only).
- Media library crop, attachment crop, OG crop (primary/cover on the edit form only).
- CDN / WebP pipeline / AI crop.
- Machine translation.
- Laws, platforms, research, alerts, director as EN story-parity types (this PRD).
- Changing Clone Cut 1 behaviour.

## 3. Users & roles

| Role | Needs |
|------|--------|
| Super Admin | `/dashboard/import-export`: export item or type; import zip → drafts + report. Crop on any cover they can edit. Publish EN through existing four-eyes (they are not the author of restored-editor drafts). |
| Editor | Crop primary image on items they can edit. Fill EN fields; mark ready. **No** import/export. They **see imported drafts** when their email is restored as `created_by`. Cannot approve/publish their own imported or EN-updated work. |
| Reviewer | Unchanged chrome for I/E. Four-eyes on imported drafts and on EN that reaches the public site. |
| Public SPA | Cards may use `img_card`. EN locale uses ready stories as specified. |

## 4. Requirements

### Must have

**A. JSON zip (Super Admin)**

1. New CMS page `/dashboard/import-export`, nav under administration (same class as Recycle bin). Super Admin only. i18n AR+EN.
2. Pick a **content type** (all nine list types: news, events, publications, partners, alerts, laws, platforms, research groups, research projects).
3. **Export this type:** zip of every **non-recycled** row of that type + referenced `img/` files (primary, og, attachments). Not public `data/*.json` shape. CMS item records (editorial fields, org, author email, type-specific fields, SEO).
4. **Export this item:** same zip for one id, chosen on this page (search/select within the picked type). No whole-Desk zip.
5. **Import:** zip → **always new ids**, **always `draft`**, new media paths in the library. Never writes public JSON. Never submits/approves/publishes. Skip + per-item report (same spirit as bulk). Sanitize bodies with the existing allowlist.
6. **Author restore:** if `created_by` email in the zip matches an active user, that user is author (Editor then sees the drafts). Else Super Admin is author and the report says so. Keep `org_unit_id` if that unit still exists; else `centre_wide` + report. Clear publisher, review-owner, comments, revisions, recycle metadata, featured-playlist membership.
7. Recycled rows are not exported. Featured playlist is not in the zip.
8. Confirm before export and before import. Audit `*.export` / `*.import` with counts. No notification flood.
9. Type export may exceed 200 rows (backup must be complete). Warn + confirm when count is large. If a zip is too large for the server to build, fail with a clear message (export fewer / one item) — do not silently truncate.

**B. Crop + card variant**

1. On the **edit form primary/cover** only (the control they already use to upload/replace). Optional crop before save.
2. Save writes: **master** (cropped, used for detail / `img` / `image_path`) and **card** (one 16:9 card-sized derivative).
3. Public JSON for types that already have a primary image: keep `img` as master; add optional `img_card`. SPA cards/carousels use `img_card` if present, else `img`. Detail and OG use existing `img` / `og_image` (OG not cropped in this PRD).
4. Replace of a **published** primary file keeps today’s confirm. Variants regenerate from the new crop. Unused previous variant files follow existing media unreferenced rules.
5. No new packages if the stack can crop with what CMS already has; if a small well-known library is required, note it in the implementation PR — prefer zero new deps.

**C. EN when ready (news, events, publications, partners)**

1. Do not invent EN text. Desk EN fields and `en_status` stay.
2. Public payloads for those four types **emit** `en_status` plus non-empty `title`/`summary`/`body` EN (and existing partner `summary_en` / `body_en` remain). News/events/publications today omit editorial EN — that is the gap.
3. SPA `lang=en`: if `en_status !== ready` → today’s **full Arabic + notice**. If `ready` → EN title/summary/body when that field is filled; **Arabic fallback for an empty EN field**; **no** locale notice.
4. Reaching visitors is a **publish**: filling EN on a live item uses the **existing four-eyes path** (no author-only JSON rebuild). EN-pending queue (D1) still lists published + pending; ready + published items drop off after the publish that emits ready.
5. Chrome locales stay as they are (already bilingual).

### Should have

1. Import report lists skipped reasons (unknown type, bad zip, missing file in zip, org missing, author missing).
2. Export omits binary files that are not under `img/` (no absolute disk scrape).
3. Card variant width cap ~800px on the long edge; master long-edge cap ~1920px (implementation may tune; one card size only).

### Nice to have

1. Remember last type selected on the Import/Export page for this visit only (no `localStorage`).

## 5. Content / data impact

- **Import:** no public JSON writes.
- **Export:** download only; no JSON writes.
- **Crop:** next **publish** of that item writes `img` (master) + `img_card` (optional). Publications still `covers.length === pubs.length` (`covers` stay master paths unless already derived from `img`).
- **EN:** next four-eyes **publish** of news/events/publications/partners includes `en_status` and EN editorial fields. SPA reads them. [data/CMS.md](../../data/CMS.md) + root README schema must be updated when implemented.
- Preview tokens must use the same EN and `img_card` rules as live.
- No locale key-count break: add CMS + SPA strings in AR+EN together.

## 6. UX notes

- Import/Export page: type select; Export type; item search + Export item; Import drop/file picker; confirm; report; dismiss. Empty type: Export type disabled with a short reason.
- Crop: overlay or inline on the existing primary image field; Cancel leaves the file uncropped. Do not add a second media app.
- EN: no new form section. Editors already have EN fields + ready. The public notice disappears only when ready.
- Failures are sentences a desk person can act on (“This zip is too large — export one item”), not stack traces.

## 7. Technical notes

- **Ship shape (locked):** one Approved PRD → one feature branch → implement A+B+C → one Hs-style walk. Accepted risk: first production win (backup) waits until crop and EN are also done.
- Zip = manifest of CMS-shaped items + files. **Not** `news.json` dumps. Hardest to misuse.
- New ids on import (no overwrite-by-id).
- SPA: `safeImageSrc` for `img_card`. No `innerHTML`.
- Public EN must not break AR. Default path if `en_status` missing = treat as not ready (old JSON).
- Tests: import never publishes; author restore; skip recycled on export; SPA EN ready vs not ready; card vs detail image pick; crop does not write org `sort_order` or featured playlist.

## 8. Success metrics

- SA exports news as zip, imports on the same Desk: new drafts, files in library, original Editors see their rows, `news.json` hash unchanged until publish.
- Editor crops a news cover; after publish, Home/list card uses `img_card`, detail uses master.
- Published news with EN filled + ready + four-eyes publish: English locale shows EN body and **no** AR-only notice; pending items still notice + Arabic.
- `cms npm test` + SMOKE-CMS checks for I/E, crop, EN. Public JSON hashes unchanged until a walked publish.
- Clone Duplicate still works. Recycle bin unchanged.

## 9. Open questions

None blocking. Stakeholder locked 2026-08-24 via Q&A. **Approved** 2026-08-24 — implement A+B+C, one walk.

## 10. Decision log

| Date | Decision |
|------|----------|
| 2026-08-24 | Idea: leftover deferred features in **one PRD**; close gaps as interactive Q&A; target intuitivity + production boost. |
| 2026-08-24 | **In:** JSON import/export, media crop/variants, EN body parity. **Out:** static pages, journals, scheduled publish. |
| 2026-08-24 | New umbrella PRD (not an extension of clone Cut 1). Clone later I/E cuts **superseded** by this PRD when Approved. |
| 2026-08-24 | One build + **one walk** at the end (not Clone-style cuts). |
| 2026-08-24 | I/E is **Super Admin only**. Editors/Reviewers keep Duplicate. |
| 2026-08-24 | Zip of **CMS items + original files**, not public `data/*.json`. Import = **new drafts** only. |
| 2026-08-24 | Restore original Editor by email; else SA + report. |
| 2026-08-24 | Export **item + this type**. No whole-Desk zip. |
| 2026-08-24 | I/E lives on a **new SA page only** (no list/edit buttons). |
| 2026-08-24 | EN: show when **ready**; else Arabic + notice. Story types: news, events, publications, partners. Ready + per-field AR fallback, no notice. No invented text. |
| 2026-08-24 | EN on the public site is a **publish** (four-eyes). No author-only JSON rebuild. |
| 2026-08-24 | Crop on **edit-form primary** only. Master + card variant. SPA cards use `img_card` when present. |
| 2026-08-24 | Stakeholder **Approved**. Implement as specified. |
