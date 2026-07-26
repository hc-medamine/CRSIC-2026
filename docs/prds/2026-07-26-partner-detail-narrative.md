# PRD: Partner detail narrative (summary + body) and legacy enrichment

| Field | Value |
|-------|--------|
| Status | **Approved** |
| Date | 2026-07-26 |
| Author | Stakeholder + agent |
| Owners | Product / CMS |
| Related roadmap step | Post–SPA partner detail parity — content depth |
| Related | [2026-07-26-cms-spa-parity-preview-media.md](./2026-07-26-cms-spa-parity-preview-media.md); legacy WP [nat](https://www.crsic.dz/?page_id=2278) / [intl](https://www.crsic.dz/?page_id=2282) |
| Supersedes | — |

## 1. Problem

Public `#partner/{slug}` pages only show name, country, date, and emoji/image. The legacy WordPress partnership posts carry a short story plus ceremony photos. Visitors and editors lose that narrative after cutover to the new SPA. Cards also give no teaser beyond the title line.

## 2. Goals

- Partner CMS items support **summary** and **body** in AR and EN.
- Published `partners.json` carries those fields (when present) for the SPA.
- Detail route shows **image hero + summary + expandable body** (“اقرأ المزيد” / EN equivalent).
- List cards show a **one-line (max ~2-line) summary** teaser.
- Existing **11** published partners are enriched once from legacy WP (summary, body, downloaded images), keeping curated name / country / emoji.

**Non-goals**

- Changing short partner `name` from legacy news headlines.
- Partner scheduling, bulk edit, soft-delete, EN auto-translate.
- Hotlinking `crsic.dz/wp-content` long-term.
- Journals / static pages CMS.
- Expanding emergency publish to partners.

## 3. Users & roles

| Role | Needs |
|------|--------|
| Public visitor | Richer partner detail; scannable card teasers |
| Editor | Author/edit summary + body (rich body); attach partner media |
| Reviewer / Super Admin | Review, publish, restore revisions including narrative fields |
| Ops (cutover) | One-shot scrape → map → enrich → republish with dry-run report |

## 4. Requirements

### Must have

1. **Fields:** Reuse `content_items.summary_ar`, `summary_en`, `body_ar`, `body_en` for `content_type = partner` (G1). Wire create/update/snapshot/publish/preview.
2. **Body format:** HTML sanitized with the same rules as news body (G2).
3. **Summary guidance:** Soft max ~200 characters; warn in CMS, do not hard-block (G3).
4. **CMS form:** Partner edit UI exposes summary AR/EN + rich body AR/EN; EN may be empty (`en_status` pending until filled) (G5).
5. **Publish payload:** `buildPartnerPayload` / `partners.json` include optional `summary_ar`, `summary_en`, `body_ar`, `body_en` (omit empties or emit nulls consistently with other types).
6. **SPA cards (E2):** Show summary teaser from `summary_ar`; if empty, omit the line (G4). Truncate visually (~2 lines, ellipsis).
7. **SPA detail (D3):** Image hero (prefer `img` / `og_image`) + summary + collapsed `<details>` body with “اقرأ المزيد” / EN label; accessible native disclosure (G9).
8. **Revisions / restore / preview:** Partner `snapshotOf` and lifecycle restore include summary + body; public preview payload includes them (G10).
9. **Legacy cutover (C1, F1):** Scripted scrape of WP nat + intl lists and detail pages → dry-run mapping report → download images into CMS `partners` media bucket → update the 11 published rows’ summary/body/image (and `og_image` when appropriate) → republish JSON (G6, G7, G8).
10. **Mapping rule (G7):** Match by scope + known org; **do not** overwrite curated `title_ar` / country (`label_ar`) / emoji from scrape headlines.
11. **Multi-party posts (G11):** Remain one partner card; body may name multiple institutions.

### Should have

1. Card summary uses CSS line-clamp (improvement pass) so the grid stays readable.
2. Scrape report lists unmatched WP posts and partners missing narrative after cutover.
3. Smoke checklist: every published `#partner/{slug}` shows summary when present; expandable body works; images load from CMS paths.

### Nice to have

1. EN summary/body filled later by editors (not required for cutover).
2. “Source legacy URL” stored only in scrape report / audit metadata — not required on public JSON.

## 5. Content / data impact

| Surface | Change |
|---------|--------|
| `content_items` | No new columns; partners begin using `summary_*` / `body_*` |
| `data/partners.json` | Optional narrative keys + `img` when enriched |
| `img/cms/partners/` (or CMS upload mirror) | Downloaded legacy photos |
| Locales | Detail chrome: expand/collapse labels AR/EN if missing |

## 6. UX notes

- List page: one job per card — mark + name + country + date + optional summary teaser; keep links to `#partner/{slug}`.
- Detail: one composition — hero image, title, country·date meta, summary, then expandable body (not a second card grid).
- Branding rules for public SPA still apply (no hero overlay badges).
- Preview token path must render the same narrative chrome.

## 7. Technical notes

- Preferred order: (1) CMS partner field wiring + tests, (2) publish/preview/payload, (3) SPA card + detail UI, (4) scrape + dry-run + enrich + rebuild partners JSON, (5) smoke docs.
- Reuse `sanitizeBodyHtml` (or news equivalent) for body.
- Lifecycle already restores `summary_*` / `body_*` if present in snapshots once partner `snapshotOf` includes them.
- Scrape targets: `?page_id=2278` (nat), `?page_id=2282` (intl); detail via `?p=…`.
- Empty-cutover guard on `db:rebuild:partners` remains in force.

## 8. Success metrics

- All 11 published partners have AR summary + body after enrichment (or explicit defer noted in scrape report).
- Partner images served from CMS media paths, not hotlinked WP URLs.
- Cards show summary teasers; detail expandable body works in AR.
- `npm test` covers partner create/update round-trip for summary/body; restore keeps narrative.
- Republished `partners.json` validates (unique slugs, required public fields).

## 9. Open questions

- None blocking — G1–G12 locked 2026-07-26. Residual: exact fuzzy-match table for the 11 rows (resolved in scrape dry-run, human-confirmed before write).

## 10. Decision log

| Date | Decision |
|------|----------|
| 2026-07-26 | **A3** summary + body; **B2** AR+EN; **C1** scrape once into CMS; **D3** hero + summary + expandable body; **E2** card summary teaser; **F1** enrich existing 11 in-slice |
| 2026-07-26 | **G1–G12** accepted: reuse columns; HTML sanitize; ~200 soft summary; AR-first cards; EN optional; download media; keep curated name/country/emoji; enrich published in place after dry-run; `<details>` UI; restore/preview parity; one card for multi-uni posts; OOS scheduling/bulk/auto-translate/headline rename |
| 2026-07-26 | **Approved** by stakeholder; implementation shipped same day (CMS fields, SPA card/detail, legacy enrich ×11) |
