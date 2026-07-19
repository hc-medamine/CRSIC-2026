# UI/UX audit — living notes

## Step 3.5 (2026-07-16) — Done

See commit history / WORKLOG. P0–P1 responsive/motion items closed.

## P2 pass (2026-07-19) — Done on `feature/p2-a11y-i18n`

| ID | Issue | Fix |
|----|--------|-----|
| P2.1 | Focus trap drawer/lightbox | `js/a11y.js` + wired in `ui.js`; Escape topmost-only; focus restore |
| P2.2 | Org chart mobile | Stacked vertical layout ≤700px |
| P2.3 | Permanent `will-change` | Removed from hero geos; hover-only cards; parallax class |
| P2.4 | Contact / lightbox stack | Lightbox column ≤560; contact form full-width submit ≤768 |
| P2.5 | EN parity (partial) | Chrome/aria/meta/strategy wired; editorial JSON Arabic-only + notice — see [PARITY.md](./PARITY.md) |

### Intentionally not “full EN parity”

Publications, events, news, partners, journals **body fields** remain Arabic until a bilingual content schema is approved. English UI shows a notice + switch-to-Arabic control.

### Tests

`node --test tests/*.test.mjs`

## Home publications carousel (2026-07-19)

On ≤768px, `#home-pub-grid` uses CSS scroll-snap (≈82% card + peek). Desktop/tablet grid unchanged. Documented in README §6.3 and WORKLOG.
