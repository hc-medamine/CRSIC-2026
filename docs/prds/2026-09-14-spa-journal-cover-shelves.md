# PRD: SPA journal cover shelves (أغلفة المجلات)

| Field | Value |
|-------|--------|
| Status | **Approved** |
| Date | 2026-09-14 |
| Author | Stakeholder + Cursor agent |
| Owners | Stakeholder |
| Related roadmap step | Public SPA polish — journals presentation (OJS unchanged) |
| Supersedes | — |

> Append a small shelf of real issue covers to each `#journals` card. Keep the existing gradient identity block. Covers live under `img/journals/` (git-tracked). **Not** Journals-in-CMS.

## 1. Problem

Journal cards on `#journals` use CSS gradient blocks with title text only. Visitors never see real issue covers, so the four CRSIC journals feel abstract compared to publications and to the old site / OJS, where covers exist.

## 2. Goals

- Each of the four journal cards keeps its current gradient identity (freq / name / langs) and gains an appended **issue-cover shelf**.
- Covers are real images downloaded from the old site / OJS into `img/journals/` and referenced from `data/journals.json`.
- Shelf presentation is stylish and animated (overlap/fan, hover lift, staggered enter), with `prefers-reduced-motion` respected.
- OJS remains the publishing SSOT; cards and covers still deep-link out.

**Non-goals**

- Journals in CMS / replacing OJS (stays deferred).
- Live scrape or automatic sync when new issues publish (manual content update only).
- Hotlinking remote cover URLs in production.
- Replacing or removing the gradient identity block.
- EN body parity for journal copy (journals stay Arabic-only per PARITY).
- Changing footer journal promo beyond what this slice needs (out unless trivial).

## 3. Users & roles

| Role | Needs |
|------|--------|
| Public visitor | See recognizable issue covers; open OJS (journal or issue) |
| Content maintainer | Drop new cover files + JSON entries when issues appear |
| Stakeholder | Confirm look vs mockup; Approve PRD before implement |

## 4. Requirements

### Must have

1. Keep gradient block + desc + “access journal” CTA on each card; **append** a cover shelf (do not replace the gradient).
2. Shelf placement: **between** gradient block and body (desc + CTA).
3. Up to **4** issue covers per journal (fewer OK if fewer exist); hide shelf if none.
4. Store images under `img/journals/{slug}/`; schema adds `covers[]` with `src`, `alt`, optional `url`.
5. Cover click → issue `url` when present, else journal `url`; CTA unchanged.
6. Safe image loading (`safeImageSrc` / no `innerHTML`); meaningful `alt`.
7. Motion: shelf polish + hover; OS `prefers-reduced-motion` disables non-essential motion.
8. Source covers from `crsic.dz` / OJS during implement; if unreachable, stakeholder supplies files.

### Should have

1. Slight overlap / fan shelf layout with soft shadow (book-shelf feel).
2. Staggered entrance when the journals grid paints.
3. Skeleton placeholder that hints at a shelf (optional short bar).

### Nice to have

1. WebP siblings alongside JPEG/PNG if easy with existing SPA picture helpers.
2. Horizontal scroll on very narrow viewports if four covers do not fit without crushing.

## 5. Content / data impact

- [`data/journals.json`](../../data/journals.json): add optional `covers` array per journal; existing fields unchanged.
- New media: `img/journals/{slug}/…` (git-tracked public assets).
- Locales: no new keys required unless a shelf label is added (default: no label).
- `CONTENT_BASE_URL` / CMS publish: **unchanged** (journals not CMS-owned).

## 6. UX notes

- Concept mockup: gradient kept + shelf appended (stakeholder lock 2026-09-14).
- Match public brand: green / gold / cream; Amiri on titles already in place; no purple glassmorphism.
- RTL-first shelf reading order; LTR still correct.
- Touch: covers remain tappable; reduced-motion users get static shelf.

## 7. Technical notes

- Touchpoints: `js/components/journalCard.js`, `css/style.css` (+ motion), `js/ui.js` skeletons if needed, `data/journals.json`, `img/journals/`.
- Branch: `feature/spa-journal-cover-shelves` from `main` after **Approved**.
- Do not implement Journals-in-CMS or change OJS.

## 8. Success metrics

- `#journals` shows four cards with original gradients **plus** a cover shelf when covers exist.
- All cover `src` resolve under `img/journals/`; no hotlinks.
- Smoke: journals grid renders; cover and CTA links open OJS; reduced-motion OK.
- Journals CMS deferred list untouched.

## 9. Open questions

- None blocking. Slug folder names chosen at implement from OJS paths.

## 10. Decision log

| Date | Decision |
|------|----------|
| 2026-09-14 | **Idea:** real journal covers on journals page, stylish + animated; source old site / OJS. |
| 2026-09-14 | **Shelf, not single cover:** several issue covers per journal (small shelf). |
| 2026-09-14 | **Local media:** download into `img/journals/` (no hotlink). |
| 2026-09-14 | **Append, do not replace:** keep gradient identity block; append shelf. |
| 2026-09-14 | **Placement:** shelf between gradient and body; **count:** up to 4; **click:** issue URL when known else journal URL; **updates:** manual. |
| 2026-09-14 | **Out of scope:** Journals in CMS; live scrape; EN journal bodies. |
| 2026-09-14 | **Lock decision** — stakeholder; PRD status **Draft** until Approved. |
| 2026-09-14 | **Approved** — stakeholder; implement on `feature/spa-journal-cover-shelves`. |
