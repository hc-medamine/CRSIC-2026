# PRD: WordPress → CMS/SPA cutover (owned types)

| Field | Value |
|-------|--------|
| Status | **Approved** |
| Date | 2026-08-21 |
| Author | Stakeholder + agent |
| Owners | Product / CMS |
| Related roadmap step | Legacy `crsic.dz` content into CMS-owned types |
| Related | [2026-07-19-internal-content-management.md](./2026-07-19-internal-content-management.md); [2026-07-26-partner-detail-narrative.md](./2026-07-26-partner-detail-narrative.md) (partner WP enrich ×11) |
| Supersedes | — |

## 1. Problem

The public SPA and CMS catalog were seeded from local JSON, not from a full reading of the live WordPress site. Publication covers were lined up by old filenames; several books **never had a cover file**. Partner enrich only hit two listing pages. News, events, and other owned types may be thinner or missing items that still exist on `crsic.dz`. Editors do not yet “own” the rows that match their scopes; the Reviewer is not recorded as publisher on this cutover.

Who feels it: visitors (wrong or missing media), editors (incomplete desks), ops (manual copy after every pull).

## 2. Goals

- Recover missing **covers/media** from WordPress when they exist; download into `img/cms/{bucket}/` (git-tracked public files). If WordPress also has no image, leave media empty — **no leftover/journal placeholders**.
- **Replace/enrich** existing CMS rows (summary, body, media, dates, and other owned fields) from the matched WP page.
- **Ingest new** WP items that the SPA/CMS do not have yet, for **CMS-owned types only**.
- After apply: **rebuild public JSON immediately** so the SPA shows the cutover.
- Set **author** = scoped editor; **publisher** = Reviewer Fariha Boufatah (`f.boufatah@crsic.dz`).
- Cutover is **idempotent** (second run updates the same rows, does not duplicate).

**Non-goals**

- Journals / OJS issues or articles in CMS (OJS remains).
- Static institutional pages in CMS (About, org chart, etc.) — **future slice** to expand CMS ownership.
- CMS UI for bulk import, clone, or reassign editor/reviewer/publisher (ops script only this slice).
- EN auto-translate or EN editorial body parity.
- Public SPA list pagination (deferred ~200-row trigger).
- Media crop / optimize / variants.
- Hotlinking `crsic.dz/wp-content` long-term.
- Guessing research `org_unit` when WordPress has none.

## 3. Users & roles

| Role | Needs |
|------|--------|
| Public visitor | SPA lists/details match live WP for owned types; real covers when WP has them |
| Editor (Megoussi) | Author of centre-wide news, events, publications, partners, alerts |
| Editor (Medjelled) | Author of laws and platforms |
| Editor (Djefal) | Author of research groups/projects in `dept_quran_fiqh` + `dept_thought_dialogue` |
| Editor (Derrafa) | Author of research groups/projects in `dept_algeria_history` + `dept_islamic_civ` |
| Reviewer (Boufatah) | Recorded as **publisher** on this cutover (who published, not who authored) |
| Super Admin / ops | Dry-run report, apply, rollback from backup |

## 4. Requirements

### Must have

1. **Scope of crawl:** Public WordPress content that maps to CMS types: `news`, `event`, `publication`, `partner`, `alert`, `law`, `platform`, `research_group`, `research_project`. Use listing hubs + pagination + sitemap/`?p=` posts. Skip `wp-admin`, OJS (`/ojsre/`), comments feeds, and query junk.
2. **Dry-run first:** Default command writes a report (mapped / unmatched WP / unmatched CMS / extras / volume counts). **No DB or JSON writes** until `--apply` after stakeholder sign-off of that report.
3. **Match:** Same CMS `content_type` + title/slug (normalized Arabic). **Update in place** (keep CMS `id` and existing public slug when valid).
4. **Insert:** WP item with no match → create **published** row, then rebuild JSON.
5. **Duplicate WP titles:** Update the **first** match; list further URLs in the report; do not insert a twin unless a later PRD decision says so.
6. **Media:** Download images/PDFs into the type’s CMS bucket (`publicPathFor`); register `media_assets`; never keep leftover covers on titles that have no WP image.
7. **Sanitize** body HTML with the existing news/event/pub allowlist. AR only from WP; `en_status` stays pending when EN is empty.
8. **Protected fields:** Do not overwrite curated partner `title_ar` / country (`label_ar`) / emoji. Do not overwrite publication `type` / `dept` unless the CMS field is empty.
9. **Authorship:** `created_by` (author) = editor by type as in §3. Research rows with a known `org_unit` go to Djefal or Derrafa; **unknown department → skip + report** (do not guess).
10. **Publisher:** `published_by` / publish audit = Boufatah, consistent with `db:set-legacy-publisher-boufatah`.
11. **Alerts:** At most **one** live banner; if several WP notices match, keep the **newest** only.
12. **Apply:** Rebuild all owned public JSON files in one pass; SPA already reads item `media[]` / `img`. JSON fetch stays `cache: 'no-store'`.
13. **Rollback:** Before apply, copy current `data/*.json` and note a DB dump; publish backups (`*.json.bak`) remain as today.
14. **Re-run:** Same WP URL / same match key updates the same CMS row.

### Should have

1. Report includes source WP URL per row (ops only; not required on public JSON).
2. Smoke: spot-check the seven publications that never had local covers; partners CRASC + multi-university; a new news/event if ingested.
3. Polite crawl (delay, one host, identifiable User-Agent).

### Nice to have

1. Optional enrich of `site_director` portrait if WP has a newer photo (same CMS director flow).
2. Store scrape run id in audit `metadata` for forensics.

## 5. Content / data impact

| Surface | Change |
|---------|--------|
| `content_items` | Update/insert published rows; author + publisher as above |
| `media_assets` + `img/cms/{bucket}/` | New binaries tracked in git; `cms/uploads/` staging still gitignored |
| `data/news.json`, `events.json`, `publications.json`, `partners.json`, `alerts.json`, `laws.json`, `platforms.json`, `research-groups.json`, `research-projects.json` | Rebuilt from `live_payload` |
| SPA `js/` | No new routes required; consume published JSON |
| Locales | Unchanged unless a missing chrome key is found in smoke |

## 6. UX notes

- No new CMS screens this slice (ops CLI: dry-run / apply).
- Public cards: missing image → existing empty/placeholder behaviour (news placeholder; pub card with empty `src` avoided by skipping fake covers).
- Editors see the items on their desks after apply (authored by them, published by Reviewer).

## 7. Technical notes

- Extend the existing partner scrape pattern (`cms/scripts/enrich-partners-from-legacy.ts`): listing → detail → download → `build*Payload` → `rebuildPublic*Json`.
- Classify WP URLs into CMS types via known `page_id` hubs + categories, not by guessing from HTML chrome.
- Volume: if the dry-run shows a public list that would be painful without pagination, **stop and agree a date cap** before `--apply` (pagination remains deferred).
- Stack: `cms/` Node scripts + `DATABASE_URL`; no change to SPA architecture.

## 8. Success metrics

- Dry-run report accepted; apply completes without duplicate titles for a given type.
- Seven previously cover-less publications: real WP cover **or** empty media (never a leftover file).
- SPA hard-refresh shows updated lists; CMS desks show correct author; audit shows Boufatah as publisher on cutover publishes.
- Re-running dry-run after apply reports the same matches, zero new twins.

## 9. Open questions

- None blocking. Date cap only if dry-run volume is too high (decision at apply time).

## 10. Decision log

| Date | Decision |
|------|----------|
| 2026-08-21 | Goal: recover media + enrich existing + ingest new owned-type items |
| 2026-08-21 | Apply overwrites live JSON; author = scoped editor; publisher = Reviewer Boufatah |
| 2026-08-21 | This slice = CMS-owned types only; other WP pages = future CMS-ownership slice |
| 2026-08-21 | Match type + title/slug; update in place; insert if no match |
| 2026-08-21 | Duplicate WP titles: first match only; extras in report |
| 2026-08-21 | No WP image → empty media (no fake covers) |
| 2026-08-21 | Protect partner name/country/emoji; protect pub type/dept unless empty |
| 2026-08-21 | Unmatched research department: skip + report |
| 2026-08-21 | Alerts: one live item (newest) |
| 2026-08-21 | AR from WP; EN left empty |
| 2026-08-21 | Dry-run then `--apply`; idempotent; rollback via JSON/DB backup |
| 2026-08-21 | Status **Approved** — implement after this lock |
