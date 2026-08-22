# PRD: CMS remaining types — bulk unpublish / recycle

| Field | Value |
|-------|--------|
| Status | **Approved** (2026-08-22) — stakeholder: treat as Approved for remaining list types |
| Date | 2026-08-22 |
| Author | Stakeholder + agent |
| Owners | Product / CMS Desk |
| Related | [2026-08-22-cms-news-bulk-actions.md](./2026-08-22-cms-news-bulk-actions.md); [2026-08-22-cms-events-publications-bulk-actions.md](./2026-08-22-cms-events-publications-bulk-actions.md) |
| Supersedes | Nothing. Edit-page Unpublish / Move to recycle bin stay. |

## 1. Problem

Partners, alerts, laws, platforms, research groups, and research projects still unpublish or bin **one row at a time**. News, events, and publications already have the same bulk flow.

## 2. Goals

- Those six lists get the **same** bulk Unpublish / Recycle flow (select → bar → confirm → report → dismiss).
- Copy news gates verbatim. No featured-playlist prune. One public JSON rebuild per type batch.

**Non-goals:** clone, import/export, select-all-in-database, Editor unpublish, notification flood, scheduled publish, Load more on these lists (they stay full-fetch).

## 3. Users & roles

Same as news: Reviewer unpublish; SA unpublish + recycle (published = unpublish-then-bin); Editor no chrome; four-eyes per item.

## 4. Requirements

Must: opt-in `ContentListPage` bulk; loaded rows (here = the full list); max 200; skip + report; reuse `unpublish*` / `recycleContentItem`; no `pruneFeaturedNewsItem`; recycle unpublished/rejected or unpublish-then-bin; one rebuild of the matching `data/*.json` (partners keep intl/nat shape; alerts stay a single live banner after rebuild).

Alerts: bulk unpublish does not invent extra exclusivity rules. Publish exclusivity stays on **publish**.

Research: recycling a group does not delete projects (FK SET NULL only on permanent purge, as today).

## 5–8. Data / UX / tech / success

Reuse news bulk chrome and pipeline. APIs `POST /api/{type}/bulk`. No SPA files.

Success: each of the six lists matches news bulk behaviour minus featured prune.

## 9. Open questions

None. Clone / import-export remain follow-on.

## 10. Decision log

| Date | Decision |
|------|----------|
| 2026-08-22 | Stakeholder: remaining types now; treat PRD as **Approved**; copy news gates; no playlist prune. |
