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
| I9 | After unpublish (or reject): item appears in **Unpublished** / **Rejected** on dashboard for author + Reviewer/SA (Editors: own or scoped). Super Admin only: **Delete permanently** on unpublished/rejected; audit `*.delete` | ☐ |
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

## G. Gate

| # | Check | Pass? |
|---|--------|-------|
| G1 | No known bugs on this path | ☐ |
| G2 | Public SPA still loads (if you published, verify or restore JSON) | ☐ |

---

CMS Phase 1 + WordPress cutover + featured playlist are on **`main`**. Further CMS work ships on `feature/` branches. Never commit directly to `main`.
