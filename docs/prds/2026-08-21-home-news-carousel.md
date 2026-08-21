# PRD: Home Center News — paged autoplay carousel

| Field | Value |
|-------|--------|
| Status | **Delivered** on `main` (2026-08-21, merge `b1c022c`) |
| Date | 2026-08-21 |
| Author | Stakeholder + agent |
| Owners | Product / public SPA |
| Related roadmap step | Home news teaser after WP cutover volume |
| Related | [2026-07-27-spa-laws-platforms-home.md](./2026-07-27-spa-laws-platforms-home.md) (Home order; featured events carousel); [2026-08-18-motion-interactivity-polish.md](./2026-08-18-motion-interactivity-polish.md) (motion + `prefers-reduced-motion`); [2026-08-21-spa-news-event-card-byline.md](./2026-08-21-spa-news-event-card-byline.md) (card chrome unchanged) |
| Supersedes | — |

## 1. Problem

Home **أخبار المركز** shows a static six-card grid (`news.slice(0, 6)`). After the WordPress cutover the public list is already **39** stories and will keep growing. Visitors who stay on Home never see older stories unless they click **عرض كل الأخبار**. The listing page (`#news`) already has the full list (search + year chips); Home does not rotate.

Who feels it: public visitors on Home (AR/EN, desktop + touch).

## 2. Goals

- Home news pages through **all** items in the public list, **three cards per page**, looping.
- Preserve today’s **3-column** desktop grid as a **single row** (existing wrap: 2-up tablet, 1-up phone). Card design unchanged (including byline).
- Quiet autoplay that can be paused without hunting, and paged by swipe / keyboard.
- **عرض كل الأخبار** remains the way to browse/filter the full catalog.

**Non-goals**

- `#page-news` listing, search, or year chips.
- Dots / numbered pages / prev-next arrow buttons (swipe + keyboard only).
- Changing card layout, bylines, or news JSON schema.
- CMS, pagination of server lists, media crop, EN body parity, journals in CMS.
- Home events teaser or featured events carousel behaviour (already a 7s carousel with its own controls).
- A site-wide motion preference beyond OS `prefers-reduced-motion`.

## 3. Users & roles

| Role | Needs |
|------|--------|
| Public visitor | See more than three Home stories without opening `#news`; pause to read; swipe on touch |
| Visitor with `prefers-reduced-motion` | Static first three + View all; no rotation, no pause button |
| Keyboard / screen-reader user | Cards remain focusable; focus pauses rotation; Left/Right pages; pause control is a real button |
| Editor / CMS | Unchanged publish path; Home follows rebuilt `news.json` order |

## 4. Requirements

### Must have

1. **Surface:** `#home-news-grid` on Home only. Same `createNewsCard` as today.
2. **Paging:** `pageCount = Math.ceil(n / 3)`. Page `i` shows `news.slice(i * 3, i * 3 + 3)` in the same order as `#news` (story `date` descending). Last page may have **1–2** cards (no padding, no duplicates). Loop: last → first.
3. **Idle / short list:** If `n <= 3`, keep a static grid. No carousel chrome, no timers.
4. **Dwell:** After the opening fade, each page stays **5 seconds**.
5. **Start:** As soon as the news block is on screen (including at load if it already is), autoplay **fades to the next page immediately** so the visitor sees the carousel, then continues on the 5s dwell. No idle delay, no resume delay.
6. **Temporary pause:** Hover or keyboard focus **on a card** (not grid gaps), or a finger down **on a card**, pauses. Resume **immediately** after leave/lift/blur, unless explicitly paused (must 8).
7. **Touch swipe:** Horizontal swipe on the news block → next/prev page, RTL-aware. Small movement stays a card click. Vertical page scroll unchanged. After a swipe, restart the 5s dwell if play is on.
8. **Explicit pause:** One pause/play **button** in the section header, beside **عرض كل الأخبار**, matching the featured-carousel pause/play pattern (icon + AR/EN labels). Button pause **sticks** until play; hover/press/inactivity must not restart it.
9. **Keyboard:** Left/Right (flipped in RTL) changes page when focus is inside the news section. Restart 5s dwell if play is on.
10. **Off-screen:** Pause timers while the news block is not intersecting the viewport; resume the 5s dwell when it returns (if not button-paused).
11. **`prefers-reduced-motion`:** No autoplay, no fade, no pause button. First three + View all.
12. **DOM:** Render the **visible page’s cards only**. Prefetch the next page’s images during dwell. Do not keep the full list in the Home grid.
13. **Transition:** Opacity fade between pages (`transform`/`opacity` only). Instant swap when reduced-motion.
14. **Lifecycle:** Language toggle remounts at page 0. Leaving Home clears timers. No `innerHTML` assignment.

### Should have

1. `aria-label` on the pause button from locales (key sets AR/EN in sync). Do **not** `aria-live` announce every page (too noisy).
2. Reuse featured-carousel pause icon language; news module stays its own file (e.g. `js/components/homeNewsCarousel.js`).
3. Unit tests for page slicing / loop index (`tests/*.test.mjs`).

### Nice to have

1. Subtle disabled/hidden pause button when `n <= 3` rather than a layout hole (header stays aligned with View all).

## 5. Content / data impact

| Surface | Change |
|---------|--------|
| `data/news.json` | **None** (order already story-date desc) |
| `data/locales/ar.json` + `en.json` | Pause / play labels for Home news; key sets stay in sync |
| CMS / `CONTENT_BASE_URL` | None |
| Other JSON | Unchanged |

## 6. UX notes

- Header: title **أخبار المركز** · pause/play · **عرض كل الأخبار**.
- Grid looks like today’s news cards; only the three (or fewer on the last page) swap. Short last pages keep **natural card height** (no stretched cards, no forced grid min-height). Tablet 2-up may show 2+1; that is accepted.
- Two pause modes must feel different: hover is “I’m reading this card” (gaps between cards do not pause); the button is “stop this until I say so”.
- Home already has a 7s featured-events carousel **above** news; off-screen pause stops them fighting after scroll.
- Reduced-motion visitors still reach older stories via View all.

## 7. Technical notes

- Vanilla JS ES modules, named exports; `prefersReducedMotion()` in `js/utils.js`.
- Hover pause is delegated on the grid: only `.news-card` (and its children) count, not the gap.
- Swipe: pointer events on the grid with a pixel threshold so `click` on a card still opens `#news/{slug}`.
- Do not lock the grid `min-height` to a full page; short last pages keep intrinsic card size (`align-items: start`).
- Existing `#home-news-grid` id stays (router alias + smoke A4).
- Fade via CSS + class toggle; no new libraries.

## 8. Success metrics

- With 39 items: 13 pages of 3; loops. A 40th item would make a 1-card last page at the same card size.
- Hover/press/focus **on a card** pauses; pointer in grid gaps does not. Rotation resumes **immediately** after leave unless the button is paused.
- First in-view (or on load if already visible): an immediate fade to page 2, so the carousel is obvious.
- Button pause survives hover and section inactivity until Play.
- Swipe pages; tap still opens a story. RTL swipe direction correct.
- Reduced-motion: static three, no button, View all works.
- `#news` still lists all items with search/year chips.

## 9. Open questions

- None blocking. Count will grow past 39; paging is `ceil(n / 3)` with no cap (SPA list pagination ~200-row trigger stays deferred and does **not** apply to this Home teaser).

## 10. Decision log

| Date | Decision |
|------|----------|
| 2026-08-21 | Home only; `#news` unchanged. View all stays. |
| 2026-08-21 | 6 cards per page; last page short; loop. Static if `n <= 6`. |
| 2026-08-21 | Dwell **7s**; first start after **3s** section inactivity; resume **3s** after temporary pause. |
| 2026-08-21 | Inactivity = news block only (not whole-page scroll). |
| 2026-08-21 | Temporary pause: hover, press-on-card, keyboard focus. Off-screen pauses timers. |
| 2026-08-21 | Visible pause/play in the news header; sticky until Play. |
| 2026-08-21 | Swipe to next/prev (RTL-aware) + keyboard arrows. **No** dots, **no** arrow buttons. |
| 2026-08-21 | Reduced-motion: no rotation. Visible page only in the DOM. Fade transition. |
| 2026-08-21 | Status **Draft** until stakeholder marks **Approved**. |
| 2026-08-21 | Stakeholder marked **Approved**. |
| 2026-08-21 | Stakeholder: drop the 3s idle start; dwell **5s**; pause-on-hover **cards only** (not grid gaps); last page must not stretch card height. |
| 2026-08-21 | Stakeholder: no 3s resume after leaving a card; first fade runs as soon as the news block is on screen so the carousel is visible. |
| 2026-08-21 | Stakeholder: **3 cards per page** (one desktop row). Static if `n <= 3`. Tablet 2+1 wrap accepted. |
