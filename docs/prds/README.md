# Product requirement documents (PRDs)

Product specs for CRSIC live here. **New feature slices follow the PRD-first workflow** in root [README.md §5.1](../../README.md#51-product-development-workflow-prd-first) (idea → lock decision → Draft PRD → Approved → implement). Do not start implementation until the PRD is **Approved**.

## Conventions

| Rule | Detail |
|------|--------|
| Filename | `YYYY-MM-DD-short-slug.md` (e.g. `2026-07-20-internal-publishing-app.md`) |
| Status | Draft → Review → Approved → Superseded |
| Language | Prefer the language of the implementing team; keep titles bilingual (AR/EN) when useful |
| Scope | One problem / product slice per PRD |
| Link back | Reference [WORKLOG.md](../WORKLOG.md) when work starts; update root [README.md](../../README.md) §10 when roadmap changes |

## Index

| PRD | Status | Notes |
|-----|--------|-------|
| [2026-07-19-internal-content-management.md](./2026-07-19-internal-content-management.md) | **Delivered** on `main` | Step 4 core CMS — Phases 1–3 + later slices; do not reopen `feature/step4-internal-cms` |
| [2026-07-22-cms-authoring-quality-pack.md](./2026-07-22-cms-authoring-quality-pack.md) | **Approved** (2026-07-22) | Preview (A1), rich editor (B2+H1), SEO (S2+F1+L1+P1), EN queue (D1); order O1 |
| [2026-07-23-cms-navigation-authoring-ux.md](./2026-07-23-cms-navigation-authoring-ux.md) | **Approved** (2026-07-23) | Role-grouped nav, Home cockpit, forms, empty/error states — phased M1–M3 |
| [2026-07-23-cms-direction-b-visual.md](./2026-07-23-cms-direction-b-visual.md) | **Approved** (2026-07-23) | CMS Direction B; public Themes **dropped** 2026-07-26 (§8) |
| [2026-07-26-cms-spa-parity-preview-media.md](./2026-07-26-cms-spa-parity-preview-media.md) | **Approved** (2026-07-26) | SPA partner/group detail + preview ×4 + buckets; emergency stays 3-type |
| [2026-07-26-partner-detail-narrative.md](./2026-07-26-partner-detail-narrative.md) | **Approved** (2026-07-26) | Partner summary+body, SPA expandable detail, legacy WP enrich ×11 |
| [2026-07-27-spa-laws-platforms-home.md](./2026-07-27-spa-laws-platforms-home.md) | **Approved** (2026-07-27) | Laws & Platforms SPA+CMS, Home carousel/reorder, director placeholder, ongoing badge, 5-up cards, Bahij |
| [2026-07-27-laws-platforms-parity-director-cms.md](./2026-07-27-laws-platforms-parity-director-cms.md) | **Approved** (2026-07-27) | Attachments + SPA externalUrl + seed cutover; Director CMS (SA + centre-wide Reviewer); journals/About pages OOS |
| [2026-08-18-motion-interactivity-polish.md](./2026-08-18-motion-interactivity-polish.md) | **Delivered** (2026-08-19) | Motion/interactivity polish SPA + CMS — M1–M4, showy everywhere, OS-only motion gate, explicit perf budget; all merged to `main` (PRs #24–#27) |
| [2026-08-19-cms-desk-design.md](./2026-08-19-cms-desk-design.md) | **Delivered** (2026-08-19) | CMS Desk — shell + dashboard home on `main` (`25b15cc`); list/edit interiors are a follow-on slice |
| [2026-08-20-cms-desk-interiors.md](./2026-08-20-cms-desk-interiors.md) | **Delivered** (2026-08-23) | I1 lists (PR #31); I2 forms/admin/login (`071abc9`); walkthrough passed |
| [2026-08-21-wordpress-cms-spa-cutover.md](./2026-08-21-wordpress-cms-spa-cutover.md) | **Delivered** (2026-08-21) | WP → CMS/SPA owned types; `img/cms/` git-tracked; merged `b1c022c` |
| [2026-08-21-spa-news-event-card-byline.md](./2026-08-21-spa-news-event-card-byline.md) | **Delivered** (2026-08-21) | News+event cards: date, editor, reviewer, publisher (Boufatah); news sorted by story date |
| [2026-08-21-home-news-carousel.md](./2026-08-21-home-news-carousel.md) | **Delivered** (2026-08-21) | Home Center News: 3-card paged autoplay, pause, swipe/keyboard; `#news` unchanged |
| [2026-08-21-home-featured-news-playlist.md](./2026-08-21-home-featured-news-playlist.md) | **Delivered** (2026-08-21) | Home featured strip: curated news playlist max 10, four-eyes; empty → 3 newest |
| [2026-08-22-cms-reassign-authorship-ui.md](./2026-08-22-cms-reassign-authorship-ui.md) | **Delivered** (2026-08-22) | One Desks page (claims + Align); assignable scoped publisher; JSON rebuild + notifies; rebuild status badge |
| [2026-08-22-cms-list-load-more.md](./2026-08-22-cms-list-load-more.md) | **Delivered** (2026-08-22) | CMS news/events/publications Load more (page size 20); SPA and other lists unchanged |
| [2026-08-22-cms-recycle-bin.md](./2026-08-22-cms-recycle-bin.md) | **Delivered** (2026-08-22) | SA Recycle bin (unpublished/rejected); restore to draft; purge >90 days on bin open; PR #34 |
| [2026-08-22-cms-news-bulk-actions.md](./2026-08-22-cms-news-bulk-actions.md) | **Delivered** (2026-08-22) | News list bulk unpublish + SA recycle (unpublish-then-bin); skip + per-item report. On `main` (PR #36). |
| [2026-08-22-cms-events-publications-bulk-actions.md](./2026-08-22-cms-events-publications-bulk-actions.md) | **Delivered** (2026-08-22) | Events + publications list bulk; copy news gates; no featured-playlist prune. On `main` (PR #37). |
| [2026-08-22-cms-remaining-types-bulk-actions.md](./2026-08-22-cms-remaining-types-bulk-actions.md) | **Delivered** (2026-08-22) | Partners, alerts, laws, platforms, research groups, research projects list bulk; same gates; no featured prune. On `main` (PR #37). |
| [2026-08-22-cms-clone-import-export.md](./2026-08-22-cms-clone-import-export.md) | **Cut 1 Delivered** on `main` (PR #42) | Duplicate → new draft. Later I/E cuts **superseded** by [2026-08-24-cms-desk-production-boost.md](./2026-08-24-cms-desk-production-boost.md). |
| [2026-08-23-cms-editor-recycle.md](./2026-08-23-cms-editor-recycle.md) | **Delivered** on `main` (PR #41) | Editors recycle own draft/rejected; scoped bin + restore. SA keeps unpublished recycle and purge. |
| [2026-08-24-cms-table-header-sort.md](./2026-08-24-cms-table-header-sort.md) | **Delivered** on `main` (PR #43) | Click data column headers to sort CMS tables; this visit only. No URL `?sort=`. |
| [2026-08-24-cms-desk-production-boost.md](./2026-08-24-cms-desk-production-boost.md) | **Delivered** on `main` (PR #44) | SA JSON zip import/export + cover crop/card variant + EN show-when-ready. |
| [2026-08-24-cms-import-export-bulk-sort.md](./2026-08-24-cms-import-export-bulk-sort.md) | **Delivered** on `main` | I/E page picker: Load more 20, header sort, bulk **Export selected**. Type lists unchanged. |
| [2026-08-26-remaining-deferred-pack.md](./2026-08-26-remaining-deferred-pack.md) | **Approved** (2026-08-26) | Cuts A–C. **Cut C walk passed** (`feature/cms-site-pages`). Journals out. |

## Related

- Roadmap: [README.md §10](../../README.md#10-known-issues-todos--roadmap)
- Content contract (public JSON): [data/CMS.md](../../data/CMS.md)
