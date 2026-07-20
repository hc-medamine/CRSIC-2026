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
npm run db:migrate
npm run db:seed:super-admin
npm run dev
```

4. Open [http://localhost:3000/login](http://localhost:3000/login). Sign in with the Super Admin **email** (no SMTP — email is the login id only).
5. Super Admin: [http://localhost:3000/dashboard/users](http://localhost:3000/dashboard/users) to manage users.
6. Check DB: [http://localhost:3000/api/health/db](http://localhost:3000/api/health/db).

## Auth (Phase 0)

- Roles: `super_admin` | `editor` | `reviewer`
- Cookie session via `iron-session`; idle timeout **30 minutes**
- Password reset: Super Admin in-app only; no email recovery
- Notifications: in-app only (`/dashboard/notifications`)

## Content workflows (in progress)

| Type | Status | Public snapshot |
|------|--------|-----------------|
| News | Done | `data/news.json` |
| Events | Done | `data/events.json` |
| Publications | Done | `data/publications.json` (`covers.length === pubs.length`) |

Editors need the matching content-type scope (`news` / `event` / `publication`). Four-eyes: authors cannot approve their own items. First CMS publish replaces that JSON from CMS-published items only (writes `.bak` first).

## Secrets

- Never commit `.env.local` or real passwords.
- Root `.gitignore` ignores `.env.*` except `.env.example`.
