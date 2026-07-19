# Smoke checklist — CRSIC public site

Run this **before every merge to `main`** and after any change to `index.html`, `/js`, `/css`, or `/data`.  
Serve the project root over HTTP (e.g. Live Server port **5501**). Do **not** use `file://`.

Estimated time: **~5 minutes**.

---

## A. Boot & data

| # | Check | Pass? |
|---|--------|-------|
| A1 | Home loads without the red/data-error banner | ☐ |
| A2 | Publication covers appear on home (`#home-pub-grid`) | ☐ |
| A3 | Three event cards appear on home (`#home-events-grid`) from JSON | ☐ |
| A4 | News cards appear on home (`#home-news-grid`) | ☐ |
| A5 | Hard refresh still works after editing a JSON file | ☐ |

## B. Navigation & routes

| # | Check | Pass? |
|---|--------|-------|
| B1 | Hash `#about` shows about page | ☐ |
| B2 | `#publications`, `#events`, `#journals`, `#contact` each open | ☐ |
| B3 | `#org`, `#research`, `#cooperation` open (child pages) | ☐ |
| B4 | Browser back/forward restores the previous section | ☐ |
| B5 | Desktop mega-menus open/close; mobile drawer + bottom tabs work | ☐ |

## C. Language (i18n)

| # | Check | Pass? |
|---|--------|-------|
| C1 | Toggle **EN** → UI chrome English, `dir=ltr` | ☐ |
| C2 | Toggle **AR** → UI chrome Arabic, `dir=rtl` | ☐ |
| C3 | Preference survives refresh (`localStorage` `crsic_lang`) | ☐ |

## D. Features

| # | Check | Pass? |
|---|--------|-------|
| D1 | Publications: filter all / collective / individual | ☐ |
| D2 | Publications: search narrows cards | ☐ |
| D3 | Publication lightbox opens and closes | ☐ |
| D4 | Events: intl / nat tabs switch lists | ☐ |
| D5 | Contact: empty submit shakes required fields | ☐ |
| D6 | Contact: filled submit opens `mailto:contact@crsic.dz` | ☐ |

## E. Content invariants (when those files changed)

| # | Check | Pass? |
|---|--------|-------|
| E1 | `covers.length === pubs.length` in `publications.json` | ☐ |
| E2 | AR and EN locale files share the **same keys** | ☐ |
| E3 | No raw HTML in JSON content string fields | ☐ |
| E4 | README / WORKLOG updated if structure or process changed | ☐ |

## F. Motion & layout (quick)

| # | Check | Pass? |
|---|--------|-------|
| F1 | No obvious horizontal scroll on a ~375px-wide viewport | ☐ |
| F2 | With OS “reduce motion” on, heavy animations stay calm | ☐ |

---

## G. Automated unit checks (optional)

```bash
node --test tests/*.test.mjs
```

Covers Escape dialog stack + `?lang=` parsing. Does **not** replace sections A–F.
