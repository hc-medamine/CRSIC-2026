# Arabic–English parity matrix (2026-07-19; updated 2026-09-15)

**Verdict: partial English parity — not full.**  
UI chrome for core journeys is bilingual. CMS list types use **EN-when-ready**: `en_status === ready` → filled EN with per-field Arabic fallback and no notice; otherwise Arabic + notice. **Journals** remain intentionally Arabic-only (OJS / `journals.json`) — Journals-in-CMS is **cancelled** (2026-09-15). No machine-translated product copy was invented.

Locale URL: `?lang=ar|en` (hash SPA — `/ar`/`/en` path prefixes would need server rewrites; not adopted).

Legend: **Complete** · **Missing translation** · **Functionally inconsistent** · **EN-when-ready** · **Intentionally Arabic-only** · **Blocked pending approval**

## Pages & workflows

| Area | AR | EN | Status | Notes |
|------|----|----|--------|-------|
| Primary nav / mega / drawer / bottom tabs | ✓ | ✓ | Complete | `data-i18n` + `data-i18n-aria` |
| Home hero / stats / dept teasers | ✓ | ✓ | Complete | Chrome via locales |
| About (mission, vision, axes, strategy) | ✓ | ✓ | Complete | Strategy list wired to `about_strat1–6`; site-pages overlay when published |
| Org chart labels | ✓ | ✓ | Complete | Stacked mobile layout added |
| Research tabs / team chrome | ✓ | ✓ | Complete | |
| Publications UI (filters, search, lightbox chrome) | ✓ | ✓ | Complete | Type badges via `t()` |
| Publications **body** (title/dept/desc) | ✓ | ready → EN; else AR + notice | EN-when-ready | Gate via `en_status` (PR #44) |
| Events UI | ✓ | ✓ | Complete | |
| Events **body** | ✓ | ready → EN; else AR + notice | EN-when-ready | Same gate |
| News / partners **body** | ✓ | ready → EN; else AR + notice | EN-when-ready | Same gate |
| Alerts / laws / platforms **body** | ✓ | ready → EN; else AR + notice | EN-when-ready | Cut B — same gate as news |
| Research groups / projects **body** | ✓ | ready → EN; else AR + notice | EN-when-ready | Cut B — no raw `title_en` when pending |
| Journals **body** | ✓ | AR + notice | Intentionally Arabic-only | OJS; out of CMS EN-when-ready |
| Contact form labels / placeholders / success | ✓ | ✓ | Complete | Mailto body localized |
| Contact address / phone (mixed dir) | ✓ | ✓ | Complete | Phone/email Latin OK in both |
| Lightbox a11y (dialog, trap, Escape, restore) | ✓ | ✓ | Complete | |
| Drawer a11y (dialog, trap, Escape, restore) | ✓ | ✓ | Complete | |
| Loading skeletons / soft-fail banner | ✓ | ✓ | Complete | |
| Document title / meta description | ✓ | ✓ | Complete | `doc_title`, `doc_description` |
| Legal / privacy pages | — | — | Blocked pending approval | Not in product scope |
| Auth / account flows | — | — | N/A | Public site has none |
| Downloadable docs in EN | — | — | Blocked pending approval | External library links |

## Hard-coded / remaining string risks

| Item | Location | Status |
|------|----------|--------|
| Schema.org JSON-LD (Arabic name/locality) | `index.html` `<script type="application/ld+json">` | Intentionally Arabic org identity; EN mirror **Blocked** |
| Social brand names (Facebook, X, LinkedIn) | Contact | OK (proper nouns) |
| Footer nested HTML initial Arabic | footer ministry | Overwritten by `data-i18n` on apply |
| Some `aria-label` on lang buttons (bilingual literals) | nav | Acceptable bilingual labels |

## Accessibility & responsive validation (manual)

| Check | Result |
|-------|--------|
| Drawer Tab cycles inside; Escape closes; focus returns to toggle | Implemented — verify in browser (SMOKE + keyboard) |
| Lightbox same | Implemented |
| Org chart ≤700px vertical stack | Implemented |
| Contact / lightbox ≤560–768 stacking | Implemented |
| `prefers-reduced-motion` | Existing gates retained; parallax `will-change` only while scrolling |
| EN `dir=ltr` / AR `dir=rtl` | `html` attributes via i18n |

## will-change performance

| Before | After |
|--------|--------|
| Permanent on `.hero-geo`, `.hero-geo-2` | **Removed** |
| Permanent on `.pub-card`/`.journal-card` | **Hover-only** |
| Permanent on `.page-hero-inner` | **Class `.is-parallaxing` while offset > 0** |

## Tests

```bash
node --test tests/*.test.mjs
```

Covers Escape stack order + `?lang=` parsing. Full keyboard/visual journeys remain in [SMOKE.md](../qa/SMOKE.md).

## Remaining risks & follow-ups

1. **Product:** Journals stay Arabic-only / OJS (**cancelled** — never move journals into CMS).
2. **Product:** EN privacy/legal if required for institutional compliance.
3. **Optional:** Path-based `/ar` `/en` if hosting adds rewrite rules.
4. **Optional:** Automated a11y e2e (Playwright) when a package toolchain is introduced.
