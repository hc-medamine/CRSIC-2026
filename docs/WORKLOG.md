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

### 2026-07-22 — Research groups & projects CMS + SPA

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
