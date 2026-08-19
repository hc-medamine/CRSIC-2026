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
| [2026-07-19-internal-content-management.md](./2026-07-19-internal-content-management.md) | **Approved** (2026-07-21) | Step 4 core CMS — Phases 1–3 on `main` |
| [2026-07-22-cms-authoring-quality-pack.md](./2026-07-22-cms-authoring-quality-pack.md) | **Approved** (2026-07-22) | Preview (A1), rich editor (B2+H1), SEO (S2+F1+L1+P1), EN queue (D1); order O1 |
| [2026-07-23-cms-navigation-authoring-ux.md](./2026-07-23-cms-navigation-authoring-ux.md) | **Approved** (2026-07-23) | Role-grouped nav, Home cockpit, forms, empty/error states — phased M1–M3 |
| [2026-07-23-cms-direction-b-visual.md](./2026-07-23-cms-direction-b-visual.md) | **Approved** (2026-07-23) | CMS Direction B; public Themes **dropped** 2026-07-26 (§8) |
| [2026-07-26-cms-spa-parity-preview-media.md](./2026-07-26-cms-spa-parity-preview-media.md) | **Approved** (2026-07-26) | SPA partner/group detail + preview ×4 + buckets; emergency stays 3-type |
| [2026-07-26-partner-detail-narrative.md](./2026-07-26-partner-detail-narrative.md) | **Approved** (2026-07-26) | Partner summary+body, SPA expandable detail, legacy WP enrich ×11 |
| [2026-07-27-spa-laws-platforms-home.md](./2026-07-27-spa-laws-platforms-home.md) | **Approved** (2026-07-27) | Laws & Platforms SPA+CMS, Home carousel/reorder, director placeholder, ongoing badge, 5-up cards, Bahij |
| [2026-07-27-laws-platforms-parity-director-cms.md](./2026-07-27-laws-platforms-parity-director-cms.md) | **Approved** (2026-07-27) | Attachments + SPA externalUrl + seed cutover; Director CMS (SA + centre-wide Reviewer); journals/About pages OOS |
| [2026-08-18-motion-interactivity-polish.md](./2026-08-18-motion-interactivity-polish.md) | **Approved** (2026-08-18) | Motion/interactivity polish SPA + CMS — M1–M4, showy everywhere, OS-only motion gate, explicit perf budget |

## Related

- Roadmap: [README.md §10](../../README.md#10-known-issues-todos--roadmap)
- Content contract (public JSON): [data/CMS.md](../../data/CMS.md)
