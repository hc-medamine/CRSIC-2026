# AGENTS.md — CRSIC 2026

Public website for the Center for Research in Islamic Sciences and Civilization (CRSIC), Laghouat, Algeria. **Read [`README.md`](./README.md) — it is the product SSOT (architecture, routes, data schemas, git rules).** This file only adds agent-critical shortcuts and gotchas.

## Two products, one repo

- **Public SPA (repo root):** vanilla JS (ES modules), zero build. `index.html` → `js/main.js`. No bundler, no TypeScript, no lint, no `.env`. SPA config lives in `js/config.js` (`CONTENT_BASE_URL`, `PREVIEW_API_BASE`) — not in env files.
- **Internal CMS (`cms/`):** Next.js 16 App Router + React 19 + PostgreSQL 18. Own `package.json` and `.env.local` (copy from `cms/.env.example`; never commit).

## Commands

```bash
npm run spa                  # serve SPA on :5500 (root; convenience only)
# or VS Code Live Server :5501  — file:// BREAKS the SPA (ES modules + fetch)
node --test tests/*.test.mjs # SPA unit tests (no CI)

cd cms
npm install                  # must be run inside cms/
npm run dev                  # auto-runs db:migrate (predev); http://localhost:3000
npm test                     # node:test on src/lib/**/*.test.ts
npm run lint                 # eslint
npm run db:smoke             # CMS smoke (needs .env.local + Postgres)
npm run db:seed:super-admin  # first-time login setup
```

## Hard workflow rules

- **PRD-first** (see `.cursor/rules/prd-first-workflow.mdc`): do **not** code a product/feature slice until its PRD under `docs/prds/` is **Approved**. Small bugfixes/ops chores may skip this.
- **CMS deferred backlog** (`.cursor/rules/cms-deferred-backlog.mdc`): do not implement deferred items (pagination, bulk ops, scheduled publish, media crop, EN body parity, …) unless a new PRD slice is explicitly started.
- `cms/AGENTS.md`: the installed Next.js version has breaking changes vs training data — read `cms/node_modules/next/dist/docs/` before writing CMS code.

## Editing content (data/*.json)

- JSON fields must be plain text — **no HTML** in content strings. UTF-8, no trailing commas.
- `publications.json`: keep `covers.length === pubs.length`.
- `data/locales/ar.json` + `en.json`: key sets must stay in sync; EN bodies of editorial content are intentionally Arabic-only (see `docs/audits/PARITY.md`).
- Content edit only → update `data/*.json` (+ optionally `docs/WORKLOG.md`); a full README rewrite is not required if schema is unchanged.

## Code conventions (SPA js/)

- ES modules with **named exports**; camelCase filenames. No `innerHTML` assignment — build DOM with `createElement`/`textContent` (`js/utils.js`: `safeImageSrc`, `setTrustedBrHtml` for `<br>` only).
- i18n via `data-i18n*` attributes + `t()` in `js/i18n.js`; locale from `?lang=` + `localStorage.crsic_lang`.
- Hash routing: `#publications` → `id="page-publications"`; parents mapped in `PAGE_PARENT` (`js/router.js`).

## Git & docs

- Branch: `feature/` | `fix/` | `content/` | `docs/`; never force-push `main`.
- Conventional Commits: `feat:` `fix:` `content:` (data) `style:` `refactor:` `docs:` `chore:`.
- `docs/WORKLOG.md`: append new entries **at the top** after meaningful changes.
- Windows PATH note: git may live at `C:\Program Files\Git\cmd\git.exe`.
