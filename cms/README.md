# CRSIC internal CMS (`cms/`)

Next.js (App Router) admin app for Step 4 — see [docs/prds/2026-07-19-internal-content-management.md](../docs/prds/2026-07-19-internal-content-management.md).

## Local stack (locked)

| Item | Value |
|------|--------|
| Framework | Next.js (App Router) |
| Database | PostgreSQL 18 — database `crsic_db`, role `crsic_cms_app` |
| Branch | `feature/step4-internal-cms` |
| Email/SMTP | Not used |

## Setup

1. Ensure PostgreSQL 18 is running and `crsic_db` / `crsic_cms_app` exist.
2. Copy `.env.example` → `.env.local` and set `DATABASE_URL`, `SESSION_SECRET` (≥32 chars), and optional seed vars.
3. Install and prepare DB:

```bash
cd cms
npm install
npm run db:seed:super-admin
npm run dev
```

Migrations apply **automatically** on `npm run dev` and `npm run build` (`predev` / `prebuild`). Manual: `npm run db:migrate`. Check: `npm run db:status`.

4. Open [http://localhost:3000/login](http://localhost:3000/login). Sign in with the Super Admin **email** (no SMTP — email is the login id only).
   - **Test login bubbles (dev only):** set `NEXT_PUBLIC_CMS_LOGIN_BUBBLES=1` in `.env.local` (never in production). SA/Reviewer from DB; editors from `EDITOR1_EMAIL`…`EDITORN_EMAIL` sharing `CMS_LOGIN_BUBBLE_EDITOR_PASSWORD`. Remove or leave the flag off before live.
5. Super Admin: [http://localhost:3000/dashboard/users](http://localhost:3000/dashboard/users) to manage users.
6. Check DB: [http://localhost:3000/api/health/db](http://localhost:3000/api/health/db).

## Auth (Phase 0)

- Roles: `super_admin` | `editor` | `reviewer`
- Cookie session via `iron-session`; idle timeout **30 minutes**
- Password reset: Super Admin in-app only; no email recovery
- Notifications: in-app only (`/dashboard/notifications`)

## Staff accounts (real people)

Login id is the **email** (no SMTP). Passwords are set in-app by the Super Admin and are **never**
committed. Names are stored AR (authoritative) + EN.

| Role | Display | Name (AR) | Name (EN) | Email |
|------|---------|-----------|-----------|-------|
| Super Admin | F. Chettih | فاطمة الزهرة شتيح | Fatima El Zahra Chettih | `f.chettih@crsic.dz` |
| Reviewer | F. Boufatah | فريحة بوفاتح | Fariha Boufatah | `f.boufatah@crsic.dz` |
| Editor | i.megoussi | ايمان مقوسي | Megoussi Imen | `i.megoussi@crsic.dz` |
| Editor | t.medjelled | طارق مجلد | Tarek Medjelled | `t.medjelled@crsic.dz` |

**Smoke accounts are test-only** (automation for `npm run db:smoke`), not real staff — keep but do
not treat as people: `smoke.editor@crsic.dz`, `smoke.reviewer@crsic.dz`.

## Content workflows (in progress)

| Type | Status | Public snapshot |
|------|--------|-----------------|
| News | Done | `data/news.json` |
| Events | Done | `data/events.json` |
| Publications | Done | `data/publications.json` (`covers.length === pubs.length`) |

Editors need the matching content-type scope (`news` / `event` / `publication`). Four-eyes: authors cannot approve their own items.

Public JSON is rebuilt from rows **where `live_payload IS NOT NULL`** (migration `010`), so:

- **Publish** sets `live_payload` (P1 public object) + `status = published`.
- **Unpublish** clears `live_payload` + `status = unpublished`.
- **Create revision (public stays live)** sends a published item back to `draft` but **keeps**
  `live_payload`, so the public site keeps serving the last published copy until the next publish.

Before the first production publish, import the existing static cards so nothing is lost — see
[CMS-CUTOVER.md](../docs/runbooks/CMS-CUTOVER.md) and `npm run db:import-legacy`.

### Operational features

- **Action queues** on `/dashboard`: Awaiting review, Needs revision, My drafts, Recently published.
- **Publish preview** (P1 public card) on each detail form, near the Publish button.
- **RTL/LTR admin chrome**: language/direction toggle (AR RTL / EN LTR), persisted in the
  `cms_lang` cookie; nav labels localised.
- **Restore a prior revision** (Reviewer / Super Admin) from the revision history panel.
- **Reassign author** (Super Admin / Reviewer) for draft / changes-requested / submitted items —
  audited as `content.reassign`.

## Media

- Max **5 MB**; JPEG / PNG / WebP / PDF (magic-byte checked)
- Public paths: `img/cms/news/`, `img/cms/events/`, `img/cms/covers/`
- Replace overwrites the **same** public path
- Staging: `cms/uploads/` (gitignored); UI: `/dashboard/media` and content forms
- Migrations auto-run on `npm run dev` / `npm run build`
- Audit log (Super Admin): `/dashboard/audit`
- Automated smoke: `npm run db:smoke` — see [docs/qa/SMOKE-CMS.md](../docs/qa/SMOKE-CMS.md)
- Ops runbook: [docs/runbooks/CMS-OPS.md](../docs/runbooks/CMS-OPS.md) (backup/restore, password reset, offboarding)
- Revision history on each news/event/publication detail page (select + compare)

## Secrets

- Never commit `.env.local` or real passwords.
- Root `.gitignore` ignores `.env.*` except `.env.example`.
