# RTL / LTR hardening — QA & authoring guide

Ops hardening (2026-07-26). Public SPA + CMS. No PRD.

## Decisions locked

| Topic | Choice |
|-------|--------|
| Scope | Public SPA **and** CMS |
| Digits | Latin in both locales |
| Scroll progress | Grow from `inline-start` (follows reading direction) |
| Tab underline | Physical `transform-origin: left` (JS `getBoundingClientRect`) — still tracks active tab in both dirs |
| Org chart row order | **A — Flip with language** (natural flex + `html[dir]`; no lock) |
| CTA arrows | CSS `::before`/`::after` + `scaleX(-1)` under `html[dir="rtl"]` — no arrows in locale strings |
| Process | Ops/hardening (skip PRD) |

## Manual QA checklist

Run once in **Arabic (RTL)** and once in **English (LTR)** (`?lang=ar` / `?lang=en`).

### Public SPA

- [ ] `<html lang>` and `dir` flip on AR↔EN toggle; refresh keeps choice
- [ ] Publications search: icon clears text (no overlap) in both dirs
- [ ] Mega panels align to the nav item’s inline-end; no clipped off-screen edge
- [ ] Team / department accent bar on **inline-start** (right in AR, left in EN)
- [ ] Nav utility separator sits between utility rail and lang toggle correctly
- [ ] Event card badge on image’s inline-end corner
- [ ] “View all” / journal / partnership CTAs show a forward arrow at **inline-end**; glyph flips with dir
- [ ] Detail “Back” shows arrow at **inline-start**; glyph flips with dir
- [ ] Mobile drawer opens from inline-start; item stagger enters from inline-end
- [ ] Scroll progress bar grows from inline-start (right→left in AR)
- [ ] Research / events tab underline slides under the active tab
- [ ] Contact email / phone stay LTR-isolated inside Arabic chrome
- [ ] Logo, social icons, search magnifier, `▾`, back-to-top **do not** mirror
- [ ] EN mode: Arabic editorial cards still readable; locale notice appears where expected
- [ ] Long EN nav labels / mega footer links wrap without overflow

### CMS

- [ ] Lang toggle updates UI copy **and** `document.documentElement` `lang`/`dir`
- [ ] Desktop sidebar stays visible after AR↔EN toggle (no off-canvas translate on `md+`)
- [ ] Arabic UI uses Tajawal (not broken Latin fallbacks)
- [ ] Sidebar slides from `start`; `ms`/`me`/`border-e` spacing looks correct in both dirs
- [ ] AR fields remain `dir="rtl"`; slug/URL fields stay LTR / auto
- [ ] List titles with mixed AR/EN (`dir="auto"`) do not reorder oddly

## Authoring rules (prevent regressions)

### Prefer CSS logical properties

| Avoid (physical) | Prefer (logical) |
|------------------|------------------|
| `margin-left` / `margin-right` | `margin-inline-start` / `margin-inline-end` |
| `padding-left` / `padding-right` | `padding-inline-start` / `padding-inline-end` |
| `left` / `right` (position) | `inset-inline-start` / `inset-inline-end` |
| `border-left` / `border-right` | `border-inline-start` / `border-inline-end` |
| `text-align: left/right` | `text-align: start/end` |

### When physical is OK

- Pointer geometry (`clientX`, `getBoundingClientRect`, ripple)
- Tab indicator `transform-origin: left` (paired with physical `translateX` from JS)
- Decorative absolute art that is intentionally asymmetric

### Directional icons

- Forward/back chevrons: use `.i18n-arrow-fwd` / `.i18n-arrow-back` (or existing classes wired in `css/style.css`) — **do not** embed `←`/`→` in `data/locales/*.json`
- Never mirror: logos, photos, brand marks, media transport icons, search glyph

### BiDi

- Latin phones, emails, URLs, codes inside Arabic UI: `dir="ltr"` and/or `unicode-bidi: isolate` / `<bdi>`
- Mixed editorial titles: `dir="auto"` when language is unknown

### Optional lint (not wired in CI)

If Stylelint is added later, ban physical directional props in `css/style.css` except via an allowlist comment:

```js
// stylelint-disable-next-line property-disallowed-list -- pointer geometry
```

Suggested disallow list: `left`, `right`, `margin-left`, `margin-right`, `padding-left`, `padding-right`, `border-left`, `border-right`, `float`.

## Before / after (this hardening pass)

| Area | Before | After |
|------|--------|-------|
| Pub search pad | Physical LTR pad vs logical icon | `padding-inline` matches icon |
| Mega / nav-drop | `right:` | `inset-inline-end` |
| Accent borders | `border-right` | `border-inline-start` |
| Nav utility | physical end separator | logical `*-inline-end` |
| CTA arrows in JSON | Mixed `←`/`→` | Text only; CSS arrows |
| Scroll progress | Always L→R | `transform-origin: inline-start` |
| Drawer stagger | Always `+translateX` | LTR uses `-translateX` |
| CMS fonts | Geist only | Tajawal when `lang=ar` / `dir=rtl` |
| CMS document lang | Wrapper only | Syncs `<html lang/dir>` |
