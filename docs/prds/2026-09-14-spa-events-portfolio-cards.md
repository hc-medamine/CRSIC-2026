# PRD: Events page portfolio-style cards (`ev-card`)

| Field | Value |
|-------|--------|
| Status | **Approved** |
| Date | 2026-09-14 |
| Author | Stakeholder + Cursor agent |
| Owners | Stakeholder |
| Related roadmap step | Public SPA polish — `#events` list presentation |
| Supersedes | Horizontal date+body `.ev-card` chrome on `#events` only |

> Restyle `#events` `.ev-card.ev-card--link` toward a portfolio-style card (cover + caption) while **keeping year groups, classes, detail click, and all current fields**. Add a short resume (summary, else stripped body). Home event rows unchanged.

## 1. Problem

Events page cards are compact horizontal strips (date badge + text). They underuse cover images and feel less editorial than peer institutional sites. Visitors miss the visual + teaser text that already exists in many event payloads.

## 2. Goals

- Each `#events` list item reads as a **portfolio-style card**: cover on top, caption below, still in a **vertical list under year groups**.
- Preserve: `ev-card` / `ev-card--link`, lightbox/detail open, category label, title, byline, status pill, date.
- Show a short **resume** when content exists (summary, else body excerpt).
- Match CRSIC brand (green/gold/cream); no TheGem/share markup.

**Non-goals**

- Changing home `#home-events-grid` / `.event-row` layout.
- Switching `#events` away from year grouping.
- Social share icons / external share panes.
- AI-generated copy; CMS schema changes; Journals-in-CMS.
- Reworking events taxonomy / chips (already shipped).

## 3. Users & roles

| Role | Needs |
|------|--------|
| Public visitor | Clearer, image-led event scan without losing date/status/byline |
| Editor | No new required CMS fields; existing summary/body/img used as-is |

## 4. Requirements

### Must have

1. Keep `#events` **year groups** (`ev-year-group` / `ev-year-label`); cards sit in a **responsive grid** under each year (side by side on wide viewports, single column on narrow).
2. Keep classes **`ev-card ev-card--link`** and existing detail open (`data-lightbox-type` / slug).
3. Card structure (conceptual): cover media → caption with date · category · title · resume (if any) · byline · status pill.
4. **Resume:** prefer editorial `summary`; else strip HTML from `body` and truncate (reuse the same approach as `newsResume`, card-length ~160–220 chars + ellipsis). If both empty, omit the resume element (12 events today).
5. **Cover:** use existing card/detail image helpers (`cmsResponsiveSources` / picture); if no media, use the same Holder fallback pattern already used for events without images — never break the card chrome.
6. Soft hover on cover (opacity/scale or overlay) without blocking click; respect `prefers-reduced-motion`.
7. RTL-safe layout; EN-when-ready via existing `editorialField` / byline.

### Should have

1. Slightly taller cover aspect (e.g. ~16:10 or 3:2) so photos read well in a list.
2. Date shown as readable line in caption (day + month + year) in addition to or instead of the old side badge — **date information must not be lost**.

### Nice to have

1. Very light list reflow animation when chips filter (already partially present).

## 5. Content / data impact

- No JSON schema change. Uses existing `img` / `media` / `summary` / `body` / bylines / `status` / `type` / `category`.
- Live snapshot (~55 events): ~38 with image, ~43 with summary or body usable for resume, ~12 with neither (resume omitted).

## 6. UX notes

- Cards sit in a responsive grid under each year (2–3 across on desktop; stacked on mobile).
- Caption stays fully readable without hover; hover only enhances the cover.
- Do not clone eldjamaa share UI.

## 7. Technical notes

- Primary: [`js/components/eventCard.js`](../../js/components/eventCard.js) `createEvCard`, [`css/style.css`](../../css/style.css) `.ev-card*`, light [`css/motion.css`](../../css/motion.css).
- Prefer extracting a small `eventResume()` next to / shared with `newsResume` rather than duplicating strip logic.
- Smoke: `#events` cards show cover + fields; click still opens detail; chip filter still works.

## 8. Success metrics

- Visual review: portfolio-style cards under years; no lost fields vs current card.
- Resume appears for events with summary/body; absent only when both empty.
- Home events unchanged; SPA tests still pass.

## 9. Open questions

_None blocking — defaults locked below._

| Topic | Default |
|-------|---------|
| “Generate summary” | **Not AI** — `summary` else stripped `body` excerpt |
| Truncate length | ~180 characters + `…` |
| Missing image | Holder fallback (existing pattern) |
| Home | Unchanged |

## 10. Decision log

| Date | Decision |
|------|----------|
| 2026-09-14 | Layout **A**: year groups + vertical list; portfolio chrome per card. |
| 2026-09-14 | **Revised:** year groups kept; cards in a **responsive multi-column grid** (side by side) so covers stay visible without a full-width banner. |
| 2026-09-14 | Caption **B**: include resume; derive from summary else body. |
| 2026-09-14 | Keep `ev-card` / `ev-card--link` + all current information fields. |
| 2026-09-14 | Out of scope: share icons, home rows, multi-column grid, AI copy. |
| 2026-09-14 | PRD **Draft** until stakeholder **Approved**. |
| 2026-09-14 | Stakeholder **Approved** — unlock SPA implementation. |
