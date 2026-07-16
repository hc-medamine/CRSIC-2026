# CRSIC 2026 — Work Log

Living record of architectural and feature work. **Append new changelog entries at the top.**

| Doc | Role |
|-----|------|
| [AUDIT.md](./AUDIT.md) | **Closed** — all P0–P3 findings resolved |
| [data/README.md](./data/README.md) | Public JSON / locale editor guide |
| [data/CMS.md](./data/CMS.md) | `CONTENT_BASE_URL` publish contract |
| [README.md](./README.md) | Living project source of truth (incl. Git workflow §5) |
| **WORKLOG.md** | This file |

---

## Status snapshot

| Item | Status |
|------|--------|
| Audit P0–P3 | **Closed** |
| Public site JSON / locales / safe DOM | **Done** |
| Git repository (`main`) | **Initialised** (2026-07-16) — local `main`; initial commit created; no remote yet |
| Git workflow docs | **Done** — [README.md §5](./README.md) |
| Step 2 — home events from JSON | Pending |
| Step 3 — smoke checklist habit | Pending (see README §5.5) |
| Step 3.5 — UI/UX audit / responsive / motion | Pending |
| Step 4 — internal app + DB (no external CMS) | Pending (after 3.5) |

---

## Changelog

### 2026-07-16 — Git workflow (step 1)

**Done:**
- Initialised local Git repository on branch `main`
- Added [`.gitignore`](./.gitignore) (OS junk, `.claude/`, env secrets, optional Node artefacts; keep `.vscode/settings.json`)
- Documented branching, Conventional Commits, review checklist, and “what to update where” in [README.md](./README.md) §5
- Locked agreed delivery sequence (steps 1 → 4) into README §10 and this status snapshot
- Clarified product direction: internal web app + database later; **no external CMS**

**Files:**
- `.gitignore` (added)
- `.git/` (repository metadata)
- `README.md` (§5 organisation, §10 roadmap/sequence)
- `WORKLOG.md` (this entry)

**Notes:**
- Git binary present at `C:\Program Files\Git\cmd\git.exe` (may need PATH in some terminals)
- Author identity verified (`hc-medamine` + GitHub noreply email)
- Initial commit created on `main`
- No remote configured

**Next:** Step 2 — drive home events teaser from `data/events.json` only.

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
