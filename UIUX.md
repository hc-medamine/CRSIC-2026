# UI/UX audit — step 3.5 (2026-07-16)

Living notes from the responsiveness / motion polish pass on `feature/ui-ux-polish`.

## Fixed in this pass (P0–P1)

| ID | Issue | Fix |
|----|--------|-----|
| P0.1 | `body { direction: rtl }` overrode EN `html[dir=ltr]` | `direction: inherit` on body + forms |
| P0.2 | Tablet 769–1024: desktop nav, hover-only megas | Drawer + bottom tabs from `max-width: 1024px` |
| P0.3 | Drawer always from physical `right` | Logical `inset-inline-start` + dir-aware `translateX` |
| P1.4 | Pubs 2-col until 480 while events 1-col at 768 | Pubs → 1-col at ≤768 |
| P1.5 | Events 3→1 with no tablet step | Events → 2-col at ≤1024, 1-col at ≤768 |
| P1.6 | Tab indicator / title / nav underline animated `left`/`width` | `transform: translateX/scaleX` |
| P1.7 | Reduced-motion gaps (scroll, ripple, shimmer) | Gates in CSS + `animations.js` |
| P1.8 | Horizontal overflow risk | `overflow-x: clip` on html/body; section-header stacks ≤768 |
| P1.9 | Touch targets &lt; 44px | Tabs, dept chips, lang buttons ≥44px |
| P1.10 | Safe-area / back-to-top | `#app` padding + FAB `inset-inline-start` + safe-area bottom |
| P1.11 | Sticky offsets | `--nav-h` CSS variable |
| Extra | Home hero double entrance | Exclude `#page-home` from `pageStagger` |
| Extra | Parallax unbounded | Clamp to 120px |

## Deferred (P2 — later polish)

- Focus trap for drawer/lightbox
- Org chart stacked mobile layout
- Permanent `will-change` cleanup
- Contact/lightbox micro-stack tweaks beyond g2@768
- Full EN content parity (product decision)

## Smoke after this pass

Run [SMOKE.md](./SMOKE.md) sections A–D + F1–F2, especially EN toggle (LTR) and tablet width (~900px) drawer.
