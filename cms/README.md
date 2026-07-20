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
2. Copy `.env.example` → `.env.local` and set `DATABASE_URL` (URL-encode special characters in the password).
3. Install and run:

```bash
cd cms
npm install
npm run dev
```

4. Check DB: open [http://localhost:3000/api/health/db](http://localhost:3000/api/health/db) — expect `"ok": true`.

## Secrets

- Never commit `.env.local` or real passwords.
- Root `.gitignore` ignores `.env.*` except `.env.example`.
