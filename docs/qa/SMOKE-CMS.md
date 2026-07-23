# Smoke checklist — CRSIC internal CMS

Run on branch `feature/step4-internal-cms` with Postgres up and `cd cms && npm run dev`.  
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
| F1 | `/dashboard/media` upload image + PDF | ☐ |
| F2 | Replace keeps same public path | ☐ |
| F3 | Audit `media.upload` / `media.replace` | ☐ |

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

## G. Gate

| # | Check | Pass? |
|---|--------|-------|
| G1 | No known bugs on this path | ☐ |
| G2 | Public SPA still loads (if you published, verify or restore JSON) | ☐ |

---

CMS Phase 1 is on `main`. Further CMS work ships on feature branches (e.g. detail-page schema).
