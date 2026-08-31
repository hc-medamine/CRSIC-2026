# PRD: Remaining deferred pack (WebP + remaining EN + static pages)

| Field | Value |
|-------|--------|
| Status | **Approved** (2026-08-26) — **Cut C walk passed** (not Delivered until `main`) |
| Date | 2026-08-26 |
| Author | Stakeholder + agent |
| Owners | Product / CMS Desk / Public SPA |
| Related roadmap step | README §10 deferred #5 remainder, #6, #7 |
| Supersedes | — (does not reopen [2026-08-24-cms-desk-production-boost.md](./2026-08-24-cms-desk-production-boost.md); that slice stays Delivered) |

> One PRD for the leftover deferred work **except journals**. Three cuts: extra media optimize (WebP), remaining EN-when-ready types, then static institutional pages in CMS. **Journals stay on OJS.** Scheduled publish stays cancelled. Stakeholder started Cut C on `feature/cms-site-pages` before A/B landed on `main`.

## 1. Problem

Three jobs are still on the deferred list after Desk production boost (PR #44):

1. **Images stay heavy.** Cover crop + `img_card` shipped, but public files are still JPEG/PNG. README already names WebP as technical debt.
2. **EN-when-ready is incomplete.** News, events, publications, and partners follow `en_status === ready`. Laws, platforms, alerts, research groups/projects still show EN fields when present (or stay Arabic) **without** the same ready gate. Research/detail helpers read `title_en` whenever `lang=en`.
3. **About / org / contact copy still needs a deploy.** Those bodies live in locale JSON. Director is already a CMS singleton. Editors cannot update mission, axes, org labels, or the contact address without a developer.

Who feels it: visitors on slow links; English visitors on laws/research; Super Admin and centre-wide Reviewer for institutional copy.

## 2. Goals

- Public cards and detail prefer a **WebP** sibling when the browser can use it; JPEG/PNG master remains the fallback.
- Every remaining CMS **list type** (not journals) uses the same EN-when-ready rule as news: ready → filled EN with per-field Arabic fallback and **no** notice; not ready → Arabic + notice. No invented translations.
- About, org chart labels, contact display fields, and cooperation intro chrome are **CMS-authored** (seeded from today’s locales), four-eyes, locales as fallback until first publish.

**Non-goals**

- **Journals in CMS** — OJS / `data/journals.json` stay the source of truth (stakeholder, 2026-08-26).
- Scheduled / timed auto-publish (cancelled).
- Email / SMTP / server-side contact form (mailto stays).
- Malware scanning (go-live track).
- Legal / privacy pages.
- Machine translation / auto-fill EN.
- CDN product, AVIF, media-library crop, attachment crop, OG crop (cover crop already shipped).
- Changing Clone, Recycle, Import/Export, featured playlist, or Director singleton behaviour except EN/WebP plumbing that already applies to their images.
- Public SPA Themes (dropped 2026-07-26).

## 3. Users & roles

| Role | Needs |
|------|--------|
| Super Admin | Cut A: WebP on publish (no extra page). Cut C: edit + publish institutional singleton (same class as Director). |
| Editor | Unchanged crop control; WebP is generated for them. Fill EN + ready on remaining types they already edit. **No** institutional About page unless they already have centre-wide (they do not — match Director: SA + centre-wide Reviewer). |
| Reviewer | Four-eyes on EN that reaches the public site (existing path). Centre-wide Reviewer: institutional pages with SA. |
| Public SPA | Smaller images; consistent EN-when-ready; About/org/contact update without a code deploy. |

## 4. Requirements

### Must have

**Cut A — Extra media optimize (WebP)**

1. On **next publish** of an item that already writes `img` / `img_card` (existing crop pipeline, `sharp` already in CMS): also write **WebP siblings** for master and card. Keep the JPEG/PNG files; do not replace them.
2. Public JSON: keep `img` and `img_card` as today; add optional `img_webp` and `img_card_webp` (same pattern as `img_card`). Missing keys = old JSON, JPEG/PNG only.
3. SPA: cards and detail use WebP when the matching `*_webp` path is present and `safeImageSrc` allows it (picture/`srcset` or equivalent — no `innerHTML`). Fallback is today’s `img` / `img_card`.
4. Attachments / OG / director portrait: generate WebP on publish when that file is the primary/cover already handled by the pipeline. Do **not** build a new media-library optimizer UI in this cut.
5. No new npm packages if `sharp` is enough (it is already a CMS dependency).

**Cut B — Remaining EN-when-ready**

1. Types: **alerts, laws, platforms, research groups, research projects**. Journals out.
2. Reuse [production boost C](./2026-08-24-cms-desk-production-boost.md): public payload emits `en_status` plus non-empty EN editorial fields; SPA `lang=en` uses `editorialField` / `isEditorialEnReady`. Replace raw `title_en` reads in `js/research.js` and `js/components/detailPage.js`.
3. Director stays the bilingual singleton it is today (quote/name/role already AR+EN). Do **not** add `en_status` to Director unless a field is empty — empty EN field already falls back in that form.
4. Reaching visitors is still a **publish** (four-eyes). EN-pending queue (D1) lists published + pending for these types too.
5. Update [audits/PARITY.md](../audits/PARITY.md) and README §6.4 so they no longer say “all editorial JSON is Arabic-only”.

**Cut C — Static institutional pages in CMS**

1. New CMS singleton (or one “Site pages” record with sections), editable by **super_admin** and **centre-wide reviewer** — same gate as Director. Route under administration (e.g. `/dashboard/site-pages`), i18n AR+EN.
2. **About** fields covering today’s locale bodies: hero tag/h1/p, nature (p1–p3), vision, mission, values, goals, axes (6), strategy (6). Headings that are chrome may stay locales; **body strings move**.
3. **Org** chart node labels (today `org_*` locale keys that name offices/divisions).
4. **Contact** display: address, phone, email, webmail label values (not the mailto form behaviour).
5. **Cooperation** intro: hero tag/h1/p and CTA paragraph (partner **cards** stay `partners.json`).
6. Publish writes e.g. `data/site-pages.json` (name locked at implement if a cleaner split is cheaper — one file preferred). SPA `#about` `#org` `#contact` `#cooperation` read it; **locales remain fallback** until the first successful publish so About never blanks.
7. Seed the singleton from current `data/locales/ar.json` + `en.json` on migrate/import (idempotent). Four-eyes on publish. Preview of the About block is a should-have.
8. Nav labels, buttons, and other chrome stay in locales. Locale key count stays in sync; do not delete `about_*` keys until after fallback is proven (may keep as fallback forever).

### Should have

1. Cut A: skip WebP write when the source is already WebP or smaller than a floor (e.g. 70-byte stubs).
2. Cut B: EN-pending queue rows for the newly included types, same D1 membership (`published` + `pending`).
3. Cut C: in-CMS preview of About (reuse A1 preview token if cheap; else a static preview panel).

### Nice to have

1. Cut A: Super Admin “rebuild WebP for this type” on Import/Export or media — **only if it falls out of the publish loop**; not a second product.
2. Cut C: org chart stays the current visual; only labels swap. No drag-and-drop org editor.

## 5. Content / data impact

- **Cut A:** next publish may add `img_webp` / `img_card_webp` under `img/cms/`. Track binaries in git like other public media. `covers.length === pubs.length` unchanged (covers stay master paths).
- **Cut B:** `alerts.json`, `laws.json`, `platforms.json`, `research-groups.json`, `research-projects.json` gain `en_status` + EN fields on next publish (missing = not ready).
- **Cut C:** new public JSON file; [data/CMS.md](../../data/CMS.md) contract table must grow. Locales kept as fallback.
- No `CONTENT_BASE_URL` change. Add SPA + CMS strings AR+EN together.
- Journals JSON untouched.

## 6. UX notes

- Cut A: invisible to Editors except smaller public images. No new form control.
- Cut B: no new EN form sections — remaining types already have EN fields + ready. Public notice disappears only when ready.
- Cut C: one Desk page with numbered sections (About, Org, Contact, Cooperation). Sticky Save / Submit / Publish like Director. Failures are sentences (“Publish failed — About left on locales”).
- RTL and `prefers-reduced-motion` unchanged.

## 7. Technical notes

- **Ship shape:** one PRD, **three cuts**, walk + merge each (A then B then C). Do not start the next cut until the previous is Delivered on `main`, unless the stakeholder later locks a single branch.
- CMS already has `sharp`. SPA: `safeImageSrc` only; named exports; no `innerHTML`.
- Tests: WebP paths never used when missing; EN not-ready still Arabic + notice on a law/group; site-pages publish does not wipe About if JSON missing (locale fallback); journals hash unchanged through all cuts.
- Preview tokens must follow the same WebP and EN rules as live for types in each cut.

## 8. Success metrics

- **A:** Publish a news cover; public card uses WebP in a supporting browser; JPEG/PNG still loads if WebP is skipped; `cms npm test` green.
- **B:** A published law with EN filled but `pending` still shows Arabic + notice in EN UI; marking ready + four-eyes shows EN title/body and hides the notice. Research group cards use the ready gate (no more raw `title_en`).
- **C:** Change About vision in CMS, four-eyes publish, `#about` updates without editing locales; with `site-pages.json` missing, About still renders from locales.
- SMOKE + SMOKE-CMS checks added per cut. Journals and scheduled-publish behaviour untouched.

## 9. Open questions

None blocking if the stakeholder confirms the locks in §10. Confirm before **Approved**:

1. Three cuts with a walk each (proposed) vs one build / one walk.
2. Cut C includes org + contact + cooperation intro (proposed) vs About-only first.
3. WebP **siblings** + JSON keys (proposed) vs rewriting `img` to `.webp` only.

## 10. Decision log

| Date | Decision |
|------|----------|
| 2026-08-26 | Stakeholder: new PRD for remaining deferred; **keep out journals in CMS**. |
| 2026-08-26 | **In:** extra media optimize, remaining EN-when-ready, static institutional pages. **Out:** journals, scheduled publish, SMTP, malware, legal pages. |
| 2026-08-26 | News/events/publications/partners EN-when-ready **already shipped** (PR #44) — Cut B does not redo them; it extends the same rule and fixes raw `title_en` reads. |
| 2026-08-26 | Proposed: three cuts A→B→C, walk each. WebP siblings (keep JPEG/PNG). Institutional singleton seeded from locales; Director-style roles. |
| 2026-08-26 | Status **Draft**. No feature-branch product code until **Approved**. |
| 2026-08-26 | Stakeholder **Approved**. Cut C: Director-class gate (SA or centre-wide Reviewer; same person Save + Publish). Footer address follows contact address. Missing `site-pages.json` → locales. No schema.org JSON-LD. Implementing on `feature/cms-site-pages`. |
| 2026-08-31 | Cut C walk passed (Sp1–Sp3, G1/G2). Not Delivered until merge to `main`. |
