# PRD: Home featured carousel motion polish (A+B+C)

| Field | Value |
|-------|--------|
| Status | **Approved** |
| Date | 2026-09-14 |
| Author | Stakeholder + Cursor agent |
| Owners | Stakeholder |
| Related roadmap step | Public SPA motion polish — Home featured strip |
| Supersedes | Hard cut `display` swap on `.feat-carousel-slide` (visual only) |

> Make `#home-feat-carousel` feel more alive with **crossfade + Ken Burns**, **caption stagger**, and an **autoplay progress bar**. No layout/IA/content changes. Respect `prefers-reduced-motion`.

## 1. Problem

The featured carousel already advances and pauses correctly, but slides swap with a hard cut and static caption. Visitors perceive it as flat compared to the rest of the polished SPA motion system.

## 2. Goals

- Slide changes use a soft **crossfade** (not `display: none` hard cut).
- Active slide image has a slow **Ken Burns** zoom/pan while visible.
- On each slide show, caption pieces (**kicker → title → summary → CTA**) stagger in.
- Autoplay shows a thin **gold progress bar** that fills until the next advance; resets on manual next/prev/dot/pause.
- All effects collapse under `prefers-reduced-motion: reduce`.

**Non-goals**

- Directional wipe / slide transitions (package D — deferred).
- Parallax layers (package E — deferred).
- Changing playlist rules, CMS, card fields, or carousel chrome layout.
- Home Center News pager motion (separate surface).
- Journals-in-CMS.

## 3. Users & roles

| Role | Needs |
|------|--------|
| Public visitor | More engaging featured strip without harder reading |
| Reduced-motion visitor | Instant static slides; no Ken Burns / stagger / progress animation |

## 4. Requirements

### Must have

1. **A — Crossfade + Ken Burns:** overlapping fades between slides (~350–500ms); active media gently scales (~1.0 → ~1.06) over the autoplay interval; transform/opacity only.
2. **B — Caption stagger:** when a slide becomes active, animate kicker, title, summary, CTA with short delays (~60–120ms); reverse/clear cleanly on leave.
3. **C — Progress bar:** gold bar along the carousel edge (top or bottom inset); duration matches autoplay timer; pause freezes; next/prev/dot restarts; hidden or static when reduced-motion or paused indefinitely if preferred (paused → freeze mid-fill OK).
4. Keep existing controls (prev/next/pause/dots), RTL, a11y labels, playlist resolution.
5. No new runtime dependencies; CSS + existing `featuredCarousel.js` only.

### Should have

1. Active dot subtly scales or brightens in sync with progress (no new controls).
2. Smoke note in `docs/qa/SMOKE.md` for featured carousel motion.

### Nice to have

1. Slightly different Ken Burns direction per slide index (alternate) for variety.

## 5. Content / data impact

None — presentation only.

## 6. UX notes

- Brand: `--green-deep`, `--gold`, cream; no purple glows or emoji.
- Progress bar: thin (~2–3px), gold, non-blocking.
- Caption text must remain readable during motion (no opacity &lt; ~0.9 on final state).

## 7. Technical notes

- [`js/components/featuredCarousel.js`](../../js/components/featuredCarousel.js), [`css/style.css`](../../css/style.css) / [`css/motion.css`](../../css/motion.css).
- Replace hard `display` toggle with absolute-stacked slides + opacity/visibility (or class-driven fade) so crossfade works.
- Gate Ken Burns / stagger / progress with `prefersReducedMotion()` (already imported).
- Autoplay interval must stay in sync with progress animation (CSS `animation` or JS timer — one source of truth).

## 8. Success metrics

- Stakeholder visual OK on Home featured strip (autoplay + manual nav + pause).
- Reduced-motion: no continuous zoom, no stagger, no progress animation.
- SPA tests still pass; no CLS spike on Home.

## 9. Open questions

_None — package **1 = A+B+C** locked._

| Topic | Default |
|-------|---------|
| Progress placement | Bottom edge of carousel frame |
| Crossfade duration | ~400ms |
| Ken Burns strength | ~6% scale |

## 10. Decision log

| Date | Decision |
|------|----------|
| 2026-09-14 | Stakeholder chose package **1: A+B+C** (not D/E). |
| 2026-09-14 | Motion-only; playlist/CMS unchanged. |
| 2026-09-14 | PRD **Draft** until stakeholder **Approved**. |
| 2026-09-14 | Stakeholder **Approved** — unlock SPA implementation. |
