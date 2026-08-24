# Smoke checklist — CRSIC internal CMS

Run on **`main`** (or a branch based on it) with Postgres up and `cd cms && npm run dev`.  
Use **two accounts** (four-eyes): one Editor (or Super Admin as author) and a **different** Reviewer.

Estimated time: **~10 minutes**.

**Danger:** Publishing from CMS **replaces** the matching public JSON with CMS-published items only (writes `.bak` first). Prefer smoke items you will unpublish, or restore from `.bak` afterward.

---

## A. Auth & audit

| # | Check | Pass? |
|---|--------|-------|
| A1 | Login with Super Admin works | ☐ |
| A2 | Bad password shows error; `/dashboard/audit` shows `auth.login.fail` | ☐ |
| A3 | Successful login appears as `auth.login.success` | ☐ |
| A4 | Logout works; audit shows `auth.logout` | ☐ |

## B. Users (Super Admin)

| # | Check | Pass? |
|---|--------|-------|
| B1 | Create Editor + Reviewer (or confirm they exist) | ☐ |
| B2 | Audit shows `user.create` | ☐ |
| B3 | Reset password / deactivate works; audit entries exist | ☐ |

## C. News path (four-eyes)

| # | Check | Pass? |
|---|--------|-------|
| C1 | Editor: create draft + upload image (alt AR) | ☐ |
| C2 | Submit with checklist | ☐ |
| C3 | Same user cannot approve (four-eyes message) | ☐ |
| C4 | Other Reviewer: approve → publish | ☐ |
| C5 | Audit: `news.submit`, `news.approve`, `news.publish` | ☐ |
| C6 | Unpublish; restore `data/news.json` from `.bak` if needed | ☐ |

## D. Events path

| # | Check | Pass? |
|---|--------|-------|
| D1 | Draft → submit → (other) approve → publish | ☐ |
| D2 | Audit `event.*` + optional unpublish / restore `.bak` | ☐ |

## E. Publications path

| # | Check | Pass? |
|---|--------|-------|
| E1 | Draft + cover upload → submit → approve → publish | ☐ |
| E2 | Published JSON keeps `covers.length === pubs.length` | ☐ |
| E3 | Unpublish / restore `.bak` if smoke-only | ☐ |

## F. Media

| # | Check | Pass? |
|---|--------|-------|
| F1 | `/dashboard/media` as Editor: own-folder upload image + PDF (SA still sees all) | ☐ |
| F2 | Replace unused file keeps same public path; replace of a **published** file shows confirm first | ☐ |
| F3 | Audit `media.upload` / `media.replace` | ☐ |
| F4 | Delete unused upload → asset leaves library; audit `media.delete` | ☐ |
| F5 | Delete asset still on a draft/published/revision → blocked dialog lists references (no force-delete) | ☐ |
| F6 | Upload to buckets `partners` / `research` / `alerts` from media library | ☐ |

## Fb. Home featured news playlist

| # | Check | Pass? |
|---|--------|-------|
| Fb1 | `/dashboard/featured-news` loads (run `npm run db:migrate` if table missing — `029_site_featured_news.sql`) | ☐ |
| Fb2 | News Editor can add/reorder ≤10 published news and **save draft**; cannot publish | ☐ |
| Fb3 | Reviewer or Super Admin can **publish**; `data/featured-news.json` updates; empty live → SPA 3 newest | ☐ |
| Fb4 | Unpublish a playlist news item → it drops from the strip (no silent backfill) | ☐ |

## G. Preview parity (all 7 types)

| # | Check | Pass? |
|---|--------|-------|
| G1 | Partner / alert / research group / research project edit pages show **Public preview** | ☐ |
| G2 | Preview opens SPA `#preview/{token}` (alert = banner mock; others = detail) | ☐ |
| G3 | Emergency panels remain **only** on news / events / publications (intentional) | ☐ |

## H. Revisions & ops

| # | Check | Pass? |
|---|--------|-------|
| H1 | Open a submitted/edited item → **Revision history** lists versions | ☐ |
| H2 | Select two revisions → changed fields highlighted | ☐ |
| H3 | Ops runbook exists: [CMS-OPS.md](../runbooks/CMS-OPS.md) | ☐ |

## I. Completion gaps (Phase 1)

| # | Check | Pass? |
|---|--------|-------|
| I1 | `/dashboard` shows queues: Awaiting review, Needs revision, My drafts, Rejected, **Unpublished**, Recently published; rows link to the right detail page | ☐ |
| I2 | Each detail form shows the **Public card preview (P1)** near Publish (news img/label/title; event date/title/type/status; pub cover/title/type/dept/desc) | ☐ |
| I3 | Chrome **language toggle** flips AR RTL ↔ EN LTR, nav labels localise, and the choice survives a reload (`cms_lang` cookie) | ☐ |
| I4 | On a **published** item: “Create revision (public stays live)” → status `draft`, but public JSON still contains the item (unchanged) | ☐ |
| I5 | Edit → submit → (other) approve → publish the revision → public JSON updates; item is not duplicated | ☐ |
| I6 | Reviewer/Super Admin: **Restore this revision** in revision history sets fields back + status `draft`; audit `*.restore_revision` | ☐ |
| I7 | Super Admin/Reviewer: **Reassign author** on a draft/changes_requested/submitted item; audit `content.reassign`; new author notified | ☐ |
| I8 | Cutover: `npm run db:import-legacy` imports current JSON as live items (idempotent; publications keep `covers.length === pubs.length`); does **not** rewrite `data/*.json` | ☐ |
| I9 | After unpublish (or reject): item appears in **Unpublished** / **Rejected** on dashboard for author + Reviewer/SA (Editors: own or scoped). Super Admin only: **Move to recycle bin** on unpublished/rejected; audit `*.recycle` | ☐ |
| I10 | Detail publish: attachments list + slug on news/events/publications; published JSON includes `id`/`slug`/`summary`/`body`/`media` | ☐ |

## J. Research groups & projects

| # | Check | Pass? |
|---|--------|-------|
| J1 | Org scopes: centre-wide shows SPA five only; research dept shows `research_group` + `research_project` | ☐ |
| J2 | Seed: `npm run db:seed:research-groups` → 8 groups in `data/research-groups.json` (+ optional sample project) | ☐ |
| J3 | SPA `#research`: each dept tab lists published groups; Quranic dept shows sample project link | ☐ |
| J4 | Open `#research-project/{slug}` — title, lead, dibaja, questions, axes, duration, impacts | ☐ |
| J5 | CMS: create draft group/project → submit → (other) approve → publish → public JSON updates | ☐ |
| J6 | Automated: `npm run db:smoke:research` (group + project four-eyes; cleans smoke titles) | ☐ |

## Desk interiors I2 (forms / admin / login)

Walk AR + EN on `:3000`. Visual only — workflow and publish rules stay the same.

| # | Check | Pass? |
|---|--------|-------|
| Dsk1 | Create or edit **news**: numbered form sections, sticky Save/Submit, comment/revision panels match Desk cards | ☐ |
| Dsk2 | Login still authenticates; language toggle works; non-production bubbles sit **under** the sign-in card | ☐ |
| Dsk3 | `/dashboard/media` shows “Showing N”; if N hits the load cap, truncated hint appears (no pager) | ☐ |
| Dsk4 | One admin page (users **or** audit) uses the same header card as lists; filters/actions still work | ☐ |
| Dsk5 | In-CMS preview chrome is localized (Home / Preview) in AR and EN | ☐ |
| Dsk6 | `prefers-reduced-motion: reduce` keeps new interiors static | ☐ |

## Align authorship (desks + public publisher)

PRD [2026-08-22-cms-reassign-authorship-ui.md](../prds/2026-08-22-cms-reassign-authorship-ui.md). Run `cd cms && npm run db:migrate` (`030`). Super Admin + Reviewer only.

| # | Check | Pass? |
|---|--------|-------|
| Al1 | `/dashboard/editors` (**Desks**) shows who-owns-what + dry-run + rebuild badge (Never until first success). `/dashboard/authorship` redirects here | ☐ |
| Al2 | Editor cannot open **Desks** (no nav; `/dashboard/editors` redirects) | ☐ |
| Al3 | Reviewer Apply cannot change items outside their exclusive orgs | ☐ |
| Al4 | Apply then a published news card editor/reviewer/publisher match CMS (or Boufatah fallback) | ☐ |
| Al5 | Per-item **Public publisher** on a published news or event rebuilds that JSON; Align badge unchanged | ☐ |
| Al6 | Receiving Editor gets one in-CMS notification; Reviewer Apply notifies active Super Admins | ☐ |
| Al7 | Second Apply with no desk changes is a no-op (no extra notifications) | ☐ |
| Al8 | Badge shows last success time + news/event counts after a rebuild | ☐ |
| Al9 | Unsaved desk checkboxes disable **Apply** until **Save desks**; after save the dry-run updates on the same page | ☐ |

## List Load more (news / events / publications)

PRD [2026-08-22-cms-list-load-more.md](../prds/2026-08-22-cms-list-load-more.md). Partners / laws / other lists stay full-fetch. No public SPA change.

| # | Check | Pass? |
|---|--------|-------|
| Lm1 | `/dashboard/news` shows at most 20 rows; **Load more** appears only if more exist | ☐ |
| Lm2 | Load more appends ~20 rows, skeleton shows under the table, button hides at the end; URL gains `page=` | ☐ |
| Lm3 | Open `?page=3` (or `?page=2` if 21–40 items): first paint is pages **1–N**, not only the last page | ☐ |
| Lm4 | Apply search or status: URL drops `page` (back to first 20 of the filter) | ☐ |
| Lm5 | `/dashboard/partners` (or laws) still lists all allowed rows; no Load more | ☐ |
| Lm6 | Editor does not see another editor’s news on Load more | ☐ |

## Recycle bin

PRD [2026-08-22-cms-recycle-bin.md](../prds/2026-08-22-cms-recycle-bin.md). Run `cd cms && npm run db:migrate` (`031`). Super Admin keeps unpublished/rejected recycle, Restore, Permanently delete, Empty, Purge. Editors: see [Editor recycle](#editor-recycle-draft--rejected).

| # | Check | Pass? |
|---|--------|-------|
| Rb1 | Super Admin: unpublished or rejected item has **Move to recycle bin** (not Delete permanently). After confirm, item is gone from the type list and appears on `/dashboard/recycle-bin` | ☐ |
| Rb2 | Recycle bin **Restore**: one click; row leaves the bin; item is a **draft** with media still attached | ☐ |
| Rb3 | Per-row **Delete permanently**: typed confirm (`DELETE` / `حذف`); item gone; unused media file gone; a file still used by another item stays | ☐ |
| Rb4 | **Empty bin**: confirm names the count **X** and has Cancel; then the bin is empty | ☐ |
| Rb5 | Item older than 90 days: opening the bin shows a banner + **Purge** (does **not** auto-delete). Purge removes only those stale rows | ☐ |
| Rb6 | Reviewer: no Recycle bin nav; `/dashboard/recycle-bin` redirects Home; `GET/POST /api/recycle-bin` is 403 | ☐ |

## Editor recycle (draft + rejected)

PRD [2026-08-23-cms-editor-recycle.md](../prds/2026-08-23-cms-editor-recycle.md). Editors bin **own** `draft` / `rejected` only. No Unpublish. No JSON rebuild. Super Admin unpublished recycle and purge stay.

| # | Check | Pass? |
|---|--------|-------|
| Er1 | Editor lists (all nine types): checkboxes + **Recycle** (no Unpublish). Select own drafts + one rejected + one submitted → confirm → submitted skipped; others leave the list | ☐ |
| Er2 | Editor edit page: **Move to recycle bin** on own draft and rejected; hidden on submitted / published | ☐ |
| Er3 | Editor Recycle bin nav; `/dashboard/recycle-bin` shows **only that Editor’s** binned rows. Restore returns them as drafts. No Permanently delete / Empty / Purge | ☐ |
| Er4 | Editor cannot recycle or restore another author’s row (API skip / 400). `POST /api/recycle-bin` purge/empty/purge-stale is 403 | ☐ |
| Er5 | Reviewer recycle still skipped (`not_sa`). Super Admin still bins unpublished (not drafts) | ☐ |
| Er6 | Public `data/*.json` unchanged after Editor recycle (drafts/rejected were not live) | ☐ |

## News list bulk (unpublish / recycle)

PRD [2026-08-22-cms-news-bulk-actions.md](../prds/2026-08-22-cms-news-bulk-actions.md). Reviewer + Super Admin unpublish; Super Admin recycle unpublished; **Editors recycle own draft/rejected** (see Er1). Same list chrome (checkbox, sticky bar, Desk modal).

| # | Check | Pass? |
|---|--------|-------|
| Nb1 | Editor: checkboxes + **Recycle** only (no Unpublish) on `/dashboard/news`. `POST /api/news/bulk` unpublish returns skipped `reviewer_required` (does not abort without a report) | ☐ |
| Nb2 | Reviewer: checkboxes + **Unpublish** only (no recycle). Select mixed published (not own) + own story → confirm count → own is skipped (four-eyes); others leave `news.json`; one rebuild | ☐ |
| Nb3 | Super Admin: **Move to recycle bin** on a mix of published + unpublished + a draft → one confirm names published-first; published unpublished then binned; unpublished binned; draft skipped; report lists each skip | ☐ |
| Nb4 | Load more rows can be selected; header checkbox is loaded rows only (not the whole CMS). Filter change clears selection | ☐ |
| Nb5 | Featured playlist drops unpublished/binned ids. Edit-page Unpublish / Move to recycle bin still work. No N in-CMS unpublish notifications for the bulk | ☐ |
| Nb6 | News bulk API does not mutate other content types (unknown/other-type ids skipped `not_found`). Featured prune remains news-only | ☐ |

## Events + publications list bulk

PRD [2026-08-22-cms-events-publications-bulk-actions.md](../prds/2026-08-22-cms-events-publications-bulk-actions.md). Same news bulk flow on `/dashboard/events` and `/dashboard/publications`. No featured-playlist prune.

| # | Check | Pass? |
|---|--------|-------|
| Ep1 | Editor: checkboxes + Recycle (no Unpublish) on events and publications. Bulk API unpublish skips with `reviewer_required` | ☐ |
| Ep2 | Reviewer: Unpublish only on both lists; own published skipped (four-eyes); others leave `events.json` / `publications.json` after one rebuild each | ☐ |
| Ep3 | SA mixed recycle on each list: published unpublished then binned; unpublished binned; draft skipped; report lists each skip | ☐ |
| Ep4 | Publication bulk unpublish keeps `covers.length === pubs.length`. Home featured **news** playlist unchanged | ☐ |
| Ep5 | Edit-page Unpublish / Move to recycle bin still work. No N in-CMS unpublish notifications for bulk | ☐ |
| Ep6 | Events/publications bulk does not rewrite `news.json`, `featured-news.json`, or other type JSON files | ☐ |

## Remaining types list bulk

PRD [2026-08-22-cms-remaining-types-bulk-actions.md](../prds/2026-08-22-cms-remaining-types-bulk-actions.md). Same news bulk flow on partners, alerts, laws, platforms, research groups, research projects. No featured-playlist prune. These lists are full-fetch (no Load more).

| # | Check | Pass? |
|---|--------|-------|
| Ot1 | Editor: checkboxes + Recycle (no Unpublish) on those six lists. Each `POST /api/{type}/bulk` unpublish skips `reviewer_required` | ☐ |
| Ot2 | Reviewer: Unpublish only; own published skipped (four-eyes); others leave that type’s public JSON after **one** rebuild | ☐ |
| Ot3 | SA mixed recycle on each list: published unpublished then binned; unpublished binned; draft skipped; report lists each skip | ☐ |
| Ot4 | Partners rebuild keeps `{ intl, nat }`. Alerts: at most one live banner after rebuild. Research: recycling a group does not delete its projects. Home featured **news** playlist unchanged | ☐ |
| Ot5 | Edit-page Unpublish / Move to recycle bin still work. No N in-CMS unpublish notifications for bulk | ☐ |
| Ot6 | Clone / import-export still absent. Header checkbox selects all on-screen rows (the full list for these types) | ☐ |

## G. Gate

| # | Check | Pass? |
|---|--------|-------|
| G1 | No known bugs on this path | ☐ |
| G2 | Public SPA still loads (if you published, verify or restore JSON) | ☐ |

---

CMS Phase 1 + WordPress cutover + featured playlist are on **`main`**. Further CMS work ships on `feature/` branches. Never commit directly to `main`.
