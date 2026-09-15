# PRD: Events two-level taxonomy (فعاليات / ملتقيات)

| Field | Value |
|-------|--------|
| Status | **Approved** |
| Date | 2026-09-14 |
| Author | Stakeholder + Cursor agent |
| Owners | Stakeholder |
| Related roadmap step | Public SPA + CMS events IA (not Journals-in-CMS) |
| Supersedes | intl/nat-only events tabs + free-text `event_type_*` as taxonomy |

> Replace the two-way intl/nat Events IA with **two sections** (tabs) and **locked subcategories** (filter chips, default **الكل**). Same taxonomy in CMS (two-level select). Migrate all published events into the new buckets.

## 1. Problem

`#events` only offers **الملتقيات الدولية** / **الملتقيات الوطنية**. Real CRSIC programming also includes lectures, visits, training, study days, and cultural meetings — today buried as free-text `type` under `nat`/`intl`. Visitors cannot browse by real category; editors can type inconsistent labels (9 distinct strings in live data). Nav mega/drawer mirrors the outdated two-way split.

## 2. Goals

- Visitors can open `#events`, pick **الفعاليات** or **الملتقيات**, then filter by subcategory (or **الكل**).
- Every published event belongs to exactly one subcategory under one section.
- CMS authoring uses a **locked two-level select** (no free-text type as taxonomy).
- Nav mega + drawer point at the two sections (not intl/nat alone).
- One-time remap of existing SPA JSON + CMS rows matches the confirmed mapping table.

**Non-goals**

- Journals in CMS (**cancelled** 2026-09-15 — always OJS).
- Changing event detail layout, media, bylines, or display status (`upcoming` / `ongoing` / `done`).
- Multi-category tagging (one category only).
- New event content beyond remapping existing items.
- EN full editorial parity for bodies (existing EN-ready rules unchanged); section/subcategory **UI labels** must exist in both locales.

## 3. Users & roles

| Role | Needs |
|------|--------|
| Public visitor | Clear two-section browse + subcategory chips |
| CMS Editor / Reviewer / Publisher | Pick section → subcategory when creating/editing events |
| Super Admin | Migrate/publish JSON; no free-text taxonomy drift |

## 4. Requirements

### Must have

1. **SPA top tabs (2):** `الفعاليات` | `الملتقيات` (replace current intl/nat tab buttons).
2. **Subcategory chips per tab**, default **الكل** (shows all items in that section). Chip set:
   - Under **الفعاليات:** محاضرات علمية · زيارات علمية · دورات تكوينية · أيام دراسية
   - Under **الملتقيات:** ملتقيات دولية · ملتقيات وطنية · ملتقيات ثقافية
3. **Nav:** Mega menu + drawer replace intl/nat links with the two sections (`data-tab` → section). Opening a section lands on that tab with chip **الكل**.
4. **CMS:** Two-level required selects (section → subcategory). Remove free-text type fields as the taxonomy source. Published card label = locked AR subcategory label (EN label when `en_status === ready` via locked EN strings, not free text).
5. **Public JSON contract:** Stop publishing `{ intl, nat }`. Publish section buckets + stable subcategory slug on each item (see §5). Update README / `data/README.md` / `data/CMS.md` / smoke.
6. **Migration:** Remap all existing events per §10 mapping; rebuild `data/events.json` from CMS (or equivalent one-shot content migration) so SPA and DB agree.
7. **Deep-link compat:** Old `data-tab="intl"` → tab الملتقيات + chip ملتقيات دولية; `data-tab="nat"` → الملتقيات + ملتقيات وطنية (bookmark/nav leftovers).

### Should have

1. Empty state copy when a chip has zero events.
2. CMS list filter or column by section/subcategory (at least visible on the form; list column if cheap).
3. Home events teaser stays “newest N across all categories” (unchanged count/behavior aside from reading the new JSON shape).

### Nice to have

1. Persist last chip in `sessionStorage` for the visit (not required for v1).
2. Hash query for chip (e.g. `#events?section=meetings&cat=intl`) — optional; `data-tab` section open is enough for v1.

## 5. Content / data impact

### Taxonomy (stable IDs)

| Section id | AR label | Subcategory id | AR label |
|------------|----------|----------------|----------|
| `activities` | الفعاليات | `lecture` | محاضرات علمية |
| | | `visit` | زيارات علمية |
| | | `training` | دورات تكوينية |
| | | `study_day` | أيام دراسية |
| `meetings` | الملتقيات | `intl` | ملتقيات دولية |
| | | `nat` | ملتقيات وطنية |
| | | `cultural` | ملتقيات ثقافية |

### Public `events.json` (target)

```json
{
  "activities": [ /* items with category in lecture|visit|training|study_day */ ],
  "meetings": [ /* items with category in intl|nat|cultural */ ]
}
```

Each item keeps existing fields (`id`, `slug`, `title`, dates, `status`, media, bylines, …). Replace free-form taxonomy with:

- `category` — subcategory id (required)
- `type` — AR display label from the locked table (for cards / detail; may remain for backward-compatible CSS hooks)
- `type_en` — locked EN label when EN-ready (optional field; prefer locale-driven display in SPA if simpler, but publish may still emit `type`/`type_en` for parity with current card code)

Remove reliance on top-level `intl` / `nat` arrays.

### CMS DB

- Replace `event_scope` (`intl`|`nat`) + free-text `event_type_ar` / `event_type_en` as taxonomy with:
  - `event_section` (`activities`|`meetings`)
  - `event_category` (one of the seven ids; CHECK constrained to legal pairs)
- Migration SQL + data UPDATE from old scope/type strings using the remap table.
- Publish path (`eventsJson.ts`) writes the new shape.
- Form: cascading selects; validation rejects illegal pairs.
- Preview payload follows the same shape.

### Locales

Add/replace i18n keys for section tabs, chips (**الكل**), nav labels/subs, empty states — AR + EN key parity.

## 6. UX notes

- `#events`: two main tabs; under the active tab, a chip row (الكل + subcategories for that section only); list below filtered by chip; year grouping may remain as today.
- Default: tab **الفعاليات**, chip **الكل**.
- Card/detail still show the subcategory label (not the parent section name alone).
- Preserve existing card chrome (date, bylines, status pill, cover hover) — taxonomy only.
- Branding: reuse existing tab/chip patterns from the SPA; do not invent a new card system.

## 7. Technical notes

- SPA: [`js/data.js`](../../js/data.js), [`js/ui.js`](../../js/ui.js) (`switchEventsTab`), [`js/components/eventCard.js`](../../js/components/eventCard.js), [`index.html`](../../index.html) events page + mega/drawer, locales.
- CMS: [`cms/src/lib/content/events.ts`](../../cms/src/lib/content/events.ts), [`cms/src/lib/publish/eventsJson.ts`](../../cms/src/lib/publish/eventsJson.ts), [`cms/src/app/dashboard/events/event-form.tsx`](../../cms/src/app/dashboard/events/event-form.tsx), SQL under `cms/sql/`, tests for validate/publish.
- Feature branch after **Approved** (e.g. `feature/events-two-level-taxonomy`); never commit taxonomy code on `main` without PR.
- Update [`docs/qa/SMOKE.md`](../qa/SMOKE.md) D4 and CMS smoke events checks.

## 8. Success metrics

- SPA shows 2 tabs + correct chips; **الكل** lists full section; each chip filters correctly.
- Nav opens the right section.
- CMS cannot save an event without a legal section/category pair; no free-text type field for taxonomy.
- Remapped counts: every former event appears under exactly one subcategory; zero orphans; smoke A–D pass.
- `intl`/`nat` arrays absent from published `events.json`.

## 9. Open questions

_None blocking — defaults below are locked unless stakeholder revises before Approve._

| Topic | Default |
|-------|---------|
| Default top tab | `activities` (الفعاليات) |
| Default chip | `all` (الكل) |
| Home teaser | Newest across both sections (unchanged N) |
| List column in CMS | Should-have: show category label if low cost |

## 10. Decision log

| Date | Decision |
|------|----------|
| 2026-09-14 | **IA:** One `#events` page; **2 tabs** = الفعاليات / الملتقيات; subcategories via **filter chips**, default **الكل**. |
| 2026-09-14 | **Subcategories locked** as in §5 table (includes أيام دراسية + ملتقيات ثقافية). |
| 2026-09-14 | **Nav:** Mega + drawer use the two sections (not intl/nat alone). |
| 2026-09-14 | **CMS:** Two-level select; drop free-text type as taxonomy. |
| 2026-09-14 | **Remap (confirmed)** — see table below. Type string wins; scope only as fallback if type missing. |
| 2026-09-14 | PRD status **Draft** until stakeholder marks **Approved**. |
| 2026-09-14 | Stakeholder **Approved** — unlock SPA + CMS implementation. |
| 2026-09-14 | Out of scope: Journals-in-CMS; multi-tag; detail redesign. |

### Remap table (confirmed)

| Old `type` | New section | New category |
|------------|-------------|--------------|
| محاضرة علمية | activities | lecture |
| زيارة علمية | activities | visit |
| دورة تكوينية | activities | training |
| يوم دراسي | activities | study_day |
| ملتقى وطني | meetings | nat |
| مؤتمر دولي | meetings | intl |
| ملتقى دولي | meetings | intl |
| مؤتمر علمي دولي | meetings | intl |
| ملتقى ثقافي | meetings | cultural |

## 11. Blind spots closed

| Spot | Resolution |
|------|------------|
| Orphan يوم دراسي | First-class `study_day` under الفعاليات |
| Orphan ملتقى ثقافي | First-class `cultural` under الملتقيات |
| intl/nat vs type collision | Single taxonomy; scope columns retired after migrate |
| Old nav `data-tab=intl\|nat` | Compat map to meetings + chip |
| EN labels | Locked locale strings for section/chip/type display |
| Publish cutover | JSON shape change documented; rebuild after CMS migrate |
| Rollback | Revert PR + restore previous `events.json` from git; DB migration reversible via down SQL or restore backup |

## 12. Improvements (short pass)

- Chip **الكل** avoids empty first paint when a subcategory is sparse.
- Cascading CMS selects prevent illegal pairs without extra validation UI noise.
- Compat redirects protect old mega links during the transition.
