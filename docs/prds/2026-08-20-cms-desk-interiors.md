# PRD: CMS Desk interiors — lists, forms, admin pages, login

| Field | Value |
|-------|--------|
| Status | **Approved** (2026-08-20) — **I1 Delivered** on `main` (PR #31). **I2** forms/admin/login implemented on `feature/cms-desk-interiors-i2` — awaiting walkthrough |
| Date | 2026-08-20 |
| Author | Cursor session (with stakeholder) |
| Owners | Stakeholder + agent |
| Related roadmap step | Follow-on to CMS Desk shell + dashboard ([2026-08-19-cms-desk-design.md](./2026-08-19-cms-desk-design.md), **Delivered**) |
| Supersedes | — (does not reopen the Desk shell/home PRD) |

> One slice: bring **page interiors** (the `<main>` of each CMS route after you leave Home) to the same novice-first **CMS Desk** identity as the shell and dashboard. **Visual/UX redesign only — no new content types, no routing changes, no schema changes, no public SPA, no pagination, no bulk ops.**
>
> **Locked 2026-08-20:** lists + forms + admin pages; login yes; two phases **I1 then I2**; unify news/events/publications onto `ContentListPage`; visual only; zero new deps; media “showing N” ok, no pager; public SPA out.

## 1. Problem

- CMS Desk shipped the **frame** (`CmsChrome`) and **Home**. Staff still spend the day on **lists and forms**, which were explicitly out of that slice. Those pages still look like the older Direction B tables/forms: functional, dense, less “desk”.
- News, events, and publications **duplicate** the shared `ContentListPage` table by hand. Every list restyle has to be done twice, and the three busiest lists will drift from alerts/partners/laws/platforms/research.
- Empty states are a short dashed sentence (“No news items yet”) without a create CTA. Novices do not get “what do I do now?”
- Media (and similarly capped audit/notifications fetches) can **silently omit** rows beyond a server `LIMIT`. There is no “showing N” honesty on the media library.
- Login sits **outside** the chrome. It is the first impression and does not yet read as the same product as Desk Home.

## 2. Goals

- Make every CMS interior feel like the same calm Desk workspace as Home: spacing, type, cards, buttons, empty states, status colour.
- One list implementation for all content types that use a title/status/EN/updated table — including news, events, publications.
- Novice-first: large targets, plain labels, teaching empty states with a visible **New** CTA, obvious primary actions on forms (existing sticky bar).
- Keep AR/RTL-first correctness, all roles working, zero new npm packages, OS `prefers-reduced-motion` only.

**Non-goals**

- No pagination / infinite scroll / load-more (deferred backlog; inventory is far below ~200 per type).
- No bulk ops, clone, import-export, scheduled publish, recycle bin, media crop, EN editorial body parity.
- No new content types, no `data/*.json` schema, no public `data/locales` keys, no `CONTENT_BASE_URL` change.
- No auth, workflow, queue, permission, or publish-rule changes (who can submit/review/publish/delete stays as today).
- No public SPA / `css/` / `js/` / `index.html` changes.
- No second pass on **dashboard Home** or **CmsChrome** (already Delivered) except fixing a regression if interiors work breaks them.
- Do **not** add search/status filters to content types that do not already have them.

## 3. Users & roles

| Role | Needs |
|------|--------|
| Novice editor | Find an item, open it, know which fields matter, Save/Submit without decoding a dense form |
| Regular editor / reviewer | Same lists/forms, faster scan (status, EN badge, updated); filters on news/events/publications still work |
| Super admin | Same interiors on users, org units, editors, media, audit |
| Arabic-first (RTL, Bahij/Tajawal) | Full visual parity; directional motion flips |
| `prefers-reduced-motion` | New motion static |

## 4. Requirements

### Must have

**I1 — Lists**

1. **Unify** news, events, and publications list pages onto shared `ContentListPage` (same columns: title, status, EN, updated, “showing N”). Delete the duplicated table markup.
2. **Preserve** existing `?q=` / `?status=` filters on those three types via the existing `ContentListFilters` passed as `ContentListPage`’s `toolbar`. Filtered-empty ≠ inventory-empty (see §6).
3. Restyle `ContentListPage` (and thus alerts, partners, laws, platforms, research groups/projects) to Desk: spacing, card/table chrome, header + primary **New** button, row hover/focus, row-enter stagger already capped at 12.
4. **Teaching empty state** on content lists: short plain-language line + visible create CTA (the existing `newHref` / `newLabel`). Types without a create action (if any) get explanation only.
5. Admin/utility **list-like** pages in I1 only if they already share `ContentListPage`. Media, users, org units, editors, audit, notifications stay **I2** (they are custom managers).

**I2 — Forms, admin, login**

6. Restyle shared form primitives used by all create/edit flows: `EditPageShell`, `FormSection`, `AdvancedDisclosure`, `FormStickyActions`, `FormBanner`, `PublishButton`. Do not invent a second form kit.
7. Apply that kit consistently across: news, events, publications, partners, laws, platforms, alerts, research groups/projects, director, profile.
8. Restyle admin/utility interiors: media library, users, org units, editors, audit, notifications. Workflow and data stay identical.
9. **Login** (`/login`): visual alignment with Desk (surfaces, type, ambient, card). Dev login bubbles, cookie auth, and copy keys stay; no new auth features.
10. **Media honesty:** show “showing N” (loaded count). If `N` equals the fetch limit used on that page, show a truncated hint (not a pager, not a new count API unless a cheap `COUNT` is already easy). Same honesty on audit/notifications if they already cap.

### Should have

- Whole-row click (or a large title hit target) on content list rows for novices; do not break nested controls on media/users managers.
- In-CMS preview (`/dashboard/preview/[token]`): Desk spacing + **localize** leftover hardcoded “Home” / “Preview” chrome if still English-only.
- Shared empty-state component (icon optional, not required) reused by lists and media.
- Filter toolbar visual pass (same GET form; no new query params).
- Comment thread / review-owner / away / revision-history **chrome** on edit pages matches Desk; no behaviour change.

### Nice to have

- None locked. Leave extras out unless they fall out of the shared-component restyle for free.

## 5. Content / data impact

- **None** on public `data/*.json`, SPA locales, or `CONTENT_BASE_URL`.
- **CMS i18n only** (`cms/src/lib/i18n/labels.ts`): empty-state CTAs, filtered-empty copy, media truncated hint, preview chrome if localized. AR + EN keys stay in sync.

## 6. UX notes

- **Desk feel:** calmer surfaces, more whitespace, softer shadows, SaaS-admin hierarchy (clear primary **New** / **Save**, muted utilities). Palette remains `--crs-*` (green `#1B4332`, gold `#C9A84C`, cream). Public SPA stays showy; CMS stays calm.
- **Empty vs filtered-empty:**  
  - No items in the type at all → “No news yet” + **Create** CTA.  
  - Items exist but filters match none → “No results for this search” + clear-filters affordance (link back to unfiltered list). Do not show Create as the only hint in that case.
- **Filters:** news / events / publications only in this slice. Other `ContentListPage` types keep today’s unfiltered list.
- **Forms:** numbered sections and collapsed EN/SEO stay; we restyle, we do not reorder workflow steps unless a label is unclear to novices (copy-only).
- **Login:** first-run calm; language toggle stays; production must not grow new debug UI.
- **RTL:** `dir` already from chrome/login; new translate/slide must flip. Verify [docs/qa/RTL-LTR.md](../qa/RTL-LTR.md).
- **Motion:** reuse `globals.css` primitives (row stagger, empty-state pulse, modal spring, publish check). Transform/opacity only. Gate = OS `prefers-reduced-motion`.

## 7. Technical notes

- **CMS:** Next.js 16 App Router + React 19 + Tailwind 4. Primary files: `content-list-page.tsx`, `content-list-filters.tsx`, `form-ux.tsx`, `news|events|publications/page.tsx`, form components under each type, `media/*`, `users/*`, `org-units/*`, `editors/*`, `audit/page.tsx`, `notifications/page.tsx`, `login/*`, `globals.css`, `labels.ts`.
- Unification is a **refactor with visual intent**: news/events/publications pages become thin server wrappers (auth, `list*ForUser`, `filterContentItems`, pass `toolbar={ContentListFilters}`). Behaviour of `q`/`status` must stay GET and server-filtered (`filter-content-items.ts` is not a client module).
- Zero new packages. No migrations, no env changes.
- Existing `ListSkeleton` / `loading.tsx` on list routes stay; restyle if they clash with Desk cards.
- Verification per phase: `cms` lint on touched files, `cms npm test`, SPA tests still 7/7 (untouched), `docs/qa/SMOKE-CMS.md` + RTL pass, stakeholder walkthrough on `:3000`.

## 8. Success metrics

- Stakeholder walks **I1** (lists, AR + EN) then **I2** (one create/edit flow + login + one admin page) on `npm run dev` and approves **each** merge.
- News/events/publications lists are visibly the same component as partners/laws (filters still work on the three).
- Empty inventory shows a create CTA; filtered-empty does not pretend the type is unused.
- Media library shows a count; at-limit hint if truncated.
- Login still authenticates; bubbles still only in the existing non-production gate.
- `prefers-reduced-motion: reduce` keeps new interiors static.
- No public JSON/locale drift; no new runtime dependencies.

## 9. Open questions — resolved (2026-08-20 lock)

| # | Question | Decision |
|---|----------|----------|
| 1 | Scope of interiors? | **Lists + forms + admin pages**; login **yes**; public SPA **out** |
| 2 | One merge or phased? | **Two phases: I1 lists, then I2 forms + admin + login** — one PRD, two validated merges |
| 3 | Hand-rolled news/events/publications tables? | **Unify onto `ContentListPage`** |
| 4 | Pagination / media pager? | **No pager.** Media (and capped lists) **“showing N”** + truncated hint at fetch limit |
| 5 | New dependencies? | **Zero** |
| 6 | Visual vs behaviour? | **Visual only** — no workflow/schema/auth changes |
| 7 | Filters on other types? | **No** — keep q/status on news/events/publications only |
| 8 | Dashboard Home / shell? | **Out** — already Delivered |

## 10. Decision log

| Date | Decision |
|------|----------|
| 2026-08-20 | Stakeholder chose interiors over deferred pagination (inventory too small for a pager). |
| 2026-08-20 | Scope locked (quote): *Interiors = lists + forms + admin pages; login yes; two phases I1 then I2; unify news/events/publications onto ContentListPage; visual only; zero new deps; media “showing N” ok, no pager; public SPA out.* |
| 2026-08-20 | Blind spots closed into this Draft: filtered-empty vs inventory-empty; do not add filters to other types; editors page in I2; login visual only (auth/bubbles unchanged); preview chrome localize as should-have; media honesty without a pager API; Home/shell out. |
| 2026-08-20 | PRD drafted as **Draft**. No feature-branch code until status **Approved**. |
| 2026-08-20 | Stakeholder **Approved**. Implementation starts on `feature/cms-desk-interiors` with **I1 (lists)** only; I2 after I1 walkthrough. |
| 2026-08-20 | Login bubbles: always on in non-production (opt out with `NEXT_PUBLIC_CMS_LOGIN_BUBBLES=0`); moved to a bottom developer strip, not inside the sign-in card. |

## 11. Item backlog (source of truth for implementation)

**I1 — Lists** (merge 1, after walkthrough)

- [x] Restyle `ContentListPage` to Desk (header, table/card, New CTA, empty + filtered-empty)
- [x] Switch news / events / publications pages to `ContentListPage` + `ContentListFilters` toolbar; keep `?q=` / `?status=`
- [x] Confirm alerts, partners, laws, platforms, research groups/projects inherit the restyle
- [x] Preserve `cms-row-enter` stagger cap (12) and `ListSkeleton`
- [ ] AR + EN walkthrough of at least News + one already-shared list (e.g. Partners)

**I2 — Forms, admin, login** (merge 2, after walkthrough)

- [x] Restyle `EditPageShell` + `form-ux` primitives; apply across all create/edit types + director + profile
- [x] Restyle media library + “showing N” (+ truncated hint at limit)
- [x] Restyle users, org units, editors, audit, notifications (honesty on caps if present)
- [x] Login visual alignment
- [x] Should-have: preview chrome i18n + Desk spacing; edit-page panel chrome
- [ ] AR + EN walkthrough: create/edit news, login, media
