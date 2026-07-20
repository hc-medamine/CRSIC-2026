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
| Step 4 — internal app + DB (no external CMS) | **In progress on `feature/step4-internal-cms`** — PRD [Review](./prds/2026-07-19-internal-content-management.md); local Node + PostgreSQL 18.4-2; merge when zero friction |
| Public detailed news + publication pages | **Pending** (after CMS P1; enrich SPA beyond card fields) |

---

## Changelog

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
