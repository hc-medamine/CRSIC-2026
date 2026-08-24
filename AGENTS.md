# AGENTS.md — CRSIC 2026

Public website for the Center for Research in Islamic Sciences and Civilization (CRSIC), Laghouat, Algeria. **Read [`README.md`](./README.md) — it is the product SSOT (architecture, routes, data schemas, git rules).** This file only adds agent-critical shortcuts and gotchas.

## Two products, one repo

- **Public SPA (repo root):** vanilla JS (ES modules), zero build. `index.html` → `js/main.js`. No bundler, no TypeScript, no lint, no `.env`. SPA config lives in `js/config.js` (`CONTENT_BASE_URL`, `PREVIEW_API_BASE`) — not in env files.
- **Internal CMS (`cms/`):** Next.js 16 App Router + React 19 + PostgreSQL 18. Own `package.json` and `.env.local` (copy from `cms/.env.example`; never commit).

## Commands

```bash
npm run spa                  # serve SPA on :5500 (root; convenience only)
# or VS Code Live Server :5501  — file:// BREAKS the SPA (ES modules + fetch)
npm test                     # SPA unit tests (node --test tests/*.test.mjs); no CI

cd cms
npm install                  # must be run inside cms/
npm run dev                  # auto-runs db:migrate (predev); http://localhost:3000
npm test                     # node:test on src/lib/**/*.test.ts
npm run lint                 # eslint
npm run db:smoke             # CMS smoke (needs .env.local + Postgres)
npm run db:seed:super-admin  # first-time login setup
npm run db:seed:staff        # real people + desks
npm run db:migrate           # apply cms/sql/*.sql (incl. 029 featured playlist)
npm run db:cutover:wordpress # WP → CMS (dry-run; -- --apply after sign-off)
npm run db:reassign:to-claims -- --apply  # desks SSOT → item ownership
```

Every `cms/` `npm test` and `db:*` script loads `.env.local` via `--env-file` — a missing `.env.local` fails immediately (hard error, not a prompt).

## Hard workflow rules

- **PRD-first** (see `.cursor/rules/prd-first-workflow.mdc`): do **not** code a product/feature slice until its PRD under `docs/prds/` is **Approved**. Small bugfixes/ops chores may skip this. When the stakeholder raises a new idea, start at workflow step 1 — don't jump to design or a todo list.
- **CMS deferred backlog** (`.cursor/rules/cms-deferred-backlog.mdc`): do not implement deferred items (bulk ops, media crop, EN body parity, …) unless a new PRD slice is explicitly started. Scheduled publish is **cancelled** — do not reopen.
- `cms/AGENTS.md`: the installed Next.js version has breaking changes vs training data — read `cms/node_modules/next/dist/docs/` before writing CMS code.

## Editing content (data/*.json)

- JSON fields must be plain text — **no HTML** in content strings (bodies may use the sanitized allowlist after CMS publish). UTF-8, no trailing commas.
- `publications.json`: keep `covers.length === pubs.length`.
- `data/locales/ar.json` + `en.json`: key sets must stay in sync (currently **350** keys); EN bodies of editorial content are intentionally Arabic-only (see `docs/audits/PARITY.md`).
- `featured-news.json`: `{ "ids": [] }` ordered news ids, max 10; empty → Home featured fallback.
- Content edit only → update `data/*.json` (+ optionally `docs/WORKLOG.md`); a full README rewrite is not required if schema is unchanged.

## Code conventions (SPA js/)

- ES modules with **named exports**; camelCase filenames. No `innerHTML` assignment — build DOM with `createElement`/`textContent` (`js/utils.js`: `safeImageSrc`, `setTrustedBrHtml` for `<br>` only).
- i18n via `data-i18n*` attributes + `t()` in `js/i18n.js`; locale from `?lang=` + `localStorage.crsic_lang`.
- Hash routing: `#publications` → `id="page-publications"`; parents mapped in `PAGE_PARENT` (`js/router.js`). Home featured: `js/featuredNews.js` + `js/components/featuredCarousel.js`. Home Center News: `js/homeNewsPages.js` + `js/components/homeNewsCarousel.js`.

## Git & docs

- **Mandatory — never commit directly to `main`.** All work happens on `feature/` | `fix/` | `content/` | `docs/` branches. Merge to `main` only when the work is complete, verified, and **validated by the stakeholder**. Never force-push `main`.
- Current `main` includes WordPress cutover, bylines, Home news pager, featured playlist, Editor recycle (PR #41), and CMS clone Cut 1 (PR #42).
- Before merging, run the smoke checklist in `docs/qa/SMOKE.md` (~5 min; no merge without sections A–D). CMS: `docs/qa/SMOKE-CMS.md`.
- Conventional Commits: `feat:` `fix:` `content:` (data) `style:` `refactor:` `docs:` `chore:`.
- `docs/WORKLOG.md`: append new entries **at the top** after meaningful changes.
- Root [README.md](./README.md) is the product SSOT — update it when structure, routes, schemas, or inventory change.
- Windows PATH note: git may live at `C:\Program Files\Git\cmd\git.exe`.
