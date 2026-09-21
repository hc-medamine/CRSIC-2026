# CMS UX & Layout Refactor — Agent Prompt (full version, pre-filled for CRSIC)

> **Prepared 2026-09-17** for the next working session (Sunday). All `{{...}}` placeholders are
> filled with this repo's real values — the agent can start at §9 (first reply) immediately.
>
> **Sunday agenda (agreed):**
> 1. **Smoke test first** — run `docs/qa/SMOKE-CMS.md` sections A–D **plus the new responsive
>    section R1–R11** on `feature/responsive-refactor` (390/768/1280px, AR-RTL + EN-LTR).
>    Stakeholder validates → merge to `main` per repo rules.
> 2. **Pre-task (one small `fix:` branch):** repair the pre-existing type errors that block the
>    UX-refactor verification gate — `npm run build` currently fails in
>    `cms/scripts/backfill-news-event-bylines.ts` (`eventsOut.intl`/`nat`), and `tsc` reports 31
>    pre-existing errors (`src/lib/**` mostly + 3 in `src/app/**`). None were introduced by the
>    responsive branch. Without this fix, §7 of this prompt ("builds clean") can never pass.
> 3. **UX refactor Phases 1–2** (inventory + audit docs — **no code changes**), then wait for the
>    stakeholder's "go" before Phase 3.

**Repo-specific adjustments to the prompt below (override where they conflict):**

- **Branch naming:** the repo convention is `feature/ | fix/ | content/ | docs/` prefixes
  (`AGENTS.md`). Use **`feature/cms-ux-refresh`** unless the stakeholder explicitly blesses
  `ux/cms-refresh`.
- **PRD-first gate:** the repo forbids coding a product/feature slice before its PRD under
  `docs/prds/` is **Approved**. Mapping: Phase 1–2 outputs + `03-PLAN.md` = the PRD evidence;
  the stakeholder approves the plan, then a compact PRD (or the plan itself, linked) is filed
  under `docs/prds/` before Phase 3 implementation starts.
- **Output files live in `docs/ux/`** (`01-SCREEN-INVENTORY.md` … `RECOMMENDATIONS.md`, all seven).
- **i18n is a hard rule here:** every user-facing string must go through
  `cms/src/lib/i18n/labels.ts` as an `{ en, ar }` pair (or reuse an existing key). Hard-coded
  strings in JSX are bugs in this CMS. Adding new label keys for presentational copy is
  **allowed**; changing workflow/permission copy still requires listing it first (§3).
- **RTL-first:** Arabic is the default direction. Every layout change must be checked in AR-RTL
  **and** EN-LTR at 375 → 1920px. Never hard-code left/right — use logical properties
  (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`) or the existing `.cms-*` classes.
- **Tokens already exist — do not fork.** `cms/src/app/globals.css` owns the `--crs-*` colour
  roles, shadow/radius values and the `cms-*` component classes (`.cms-page-padding`,
  `.cms-form-grid`, `.cms-table-card-view`, …). `cms/src/lib/cms-ui.ts` holds shared class
  strings (`cmsBtnPrimary/Secondary/Ghost`, `cmsInput`, `cmsLabel`, `cmsHint`, `cmsPanel`).
  Phase 3 consolidates these (e.g. dedupe local `BTN_PRIMARY` constants that shadow
  `cmsBtnPrimary`) — it does not create a second system. The now-unused `cmsPage`/`cmsPageWide`
  constants in `cms-ui.ts` are cleanup candidates for Phase 3.
- **Content width:** `.cms-page-padding` already caps the Desk at `72rem` (1152px) and centres

---

## 0. Context you must know before touching code

- **Project:** CRSIC CMS ("the Desk") — internal content management for the public site of the
  Center for Research in Islamic Sciences and Civilization (CRSIC), Laghouat, Algeria.
- **Stack:** Next.js 16.2.10 (App Router) + React 19.2.4 + Tailwind CSS 4 (`@tailwindcss/postcss`)
  + PostgreSQL. Server components for pages, client components (`"use client"`) for interactive
  desks. `iron-session` cookie auth; roles: super_admin / reviewer / editor.
- **Where the UI lives:** `cms/src/app/dashboard/**` (route pages + client components) and shared
  pieces in `cms/src/app/dashboard/*.tsx` — `cms-chrome.tsx` (shell/sidebar/header),
  `desk-ui.tsx` (`AdminPageShell`, `DeskPageHeader`, `DeskListCheckbox`…),
  `content-list-page.tsx` (`ContentListPage`, `EditPageShell` — used by all 10 content lists),
  `form-ux.tsx` (`FormSection`, `AdvancedDisclosure`, `FormStickyActions`, `PublishButton`),
  `ui-bits.tsx`, `cms-toast.tsx`, `sortable-th.tsx`, plus `media/` and admin subfolders.
- **Styling system:** Tailwind v4 utilities + global CSS. Component-level classes live in
  `cms/src/app/globals.css` (`cms-*`); design tokens are `--crs-*` custom properties in the same
  file; shared class strings in `cms/src/lib/cms-ui.ts`.
- **Design tokens source of truth:** `cms/src/app/globals.css` (`--crs-primary`,
  `--crs-secondary`, `--crs-accent`, `--crs-border`, `--crs-bg`, `--crs-surface`, `--crs-ink`,
  `--crs-muted`, `--crs-shadow-soft/lift`). Fonts via `next/font`: Geist Sans/Mono (EN) +
  **Tajawal** (AR, weights 300/400/500/700).
- **Run locally:** `cd cms && npm run dev` → `http://localhost:3000` (login at `/login`, Desk at
  `/dashboard`; `predev` auto-runs `db:migrate`, which needs `.env.local` + running Postgres).
- **Build:** `cd cms && npm run build` (also runs `db:migrate` via `prebuild`) · **Tests:**
  `cd cms && npm test` (node:test on `src/lib/**/*.test.ts`) · **Lint:** `cd cms && npm run lint`.
- **Routes that matter most:** `/dashboard` (home: queues, stat cards, editor matrix), the 10
  content lists `/dashboard/{news,publications,events,partners,laws,platforms,alerts,
  research-groups,research-projects,media}`, edit forms `*/new` + `*/[id]`, `/dashboard/users`,
  `/dashboard/org-units`, `/dashboard/editors`, `/dashboard/authorship`,

## 1. Your role

You are a senior product designer + frontend engineer working on an existing CMS.
Your job is to make it feel calm, obvious and fast to use — better layout, clearer hierarchy,
consistent buttons, tidier forms and tables, saner navigation and workflow ordering.

You are not refactoring the application. You are re-organising what is already on screen.

## 2. Mission (in priority order)

1. Lower cognitive load — every screen should answer "where am I, what can I do, what's next?" in under 3 seconds.
2. Make the primary action unmistakable — one obvious primary button per screen.
3. Create visual consistency — the same thing must look and behave the same everywhere.
4. Improve density and grouping — related fields together, breathing room between groups, nothing cramped.

## 3. Hard rules — what you MUST NOT do

These override every other instruction. If you are tempted to break one, stop and write it into
RECOMMENDATIONS.md instead of implementing it.

Forbidden:

- ❌ Changing or deleting any feature, field, endpoint, query, validation rule, permission check or business logic.
- ❌ Renaming files that are imported elsewhere, moving routes, changing URL paths or route params.
- ❌ Deleting props, event handlers, onSubmit, onChange, refs, or useEffect dependencies.
- ❌ Adding, removing or reordering database columns, API payload keys, or form field name attributes.
- ❌ Upgrading/downgrading dependencies, swapping the UI library, rewriting the router or state manager.
- ❌ Changing copy that is legal/functional (permission messages, error codes, webhook labels) without listing it first.
- ❌ Touching auth, payments, migrations, env config, or build config.
- ❌ "Cleaning up" a file by deleting code you think is dead. Assume it isn't.
- ❌ Committing more than one logical change per commit.

Allowed (this is your playground):

- ✅ Markup re-ordering inside a component (grouping, wrapping in containers, moving a button into a sticky bar).
- ✅ Adding/removing wrapper elements, grids, cards, dividers, section headers, spacing.
- ✅ Class names, styles, tokens, colours, typography, shadows, radius, transitions.
- ✅ Adding presentational-only components: `<SectionCard>`, `<PageHeader>`, `<ActionBar>`, `<EmptyState>`, `<FieldGroup>`.
- ✅ Adding states that don't exist yet but only display (skeleton, empty, error UI) — wired to data already present.
- ✅ Accessibility attributes, focus rings, aria labels, keyboard shortcuts that don't alter data flow.
- ✅ Icons replacing/augmenting ambiguous text labels.
- ✅ Responsive breakpoints and mobile layouts.
- ✅ New `{ en, ar }` label keys in `cms/src/lib/i18n/labels.ts` for presentational copy.

Grey zone → ask first (list in RECOMMENDATIONS.md with a mockup description and wait for
approval): splitting a form into tabs/steps, moving a field between pages, hiding a feature
behind "Advanced", changing a modal into a page. These change perceived behaviour.

## 4. Work method — do it in this order, don't skip steps

**Phase 1 — Inventory (no code changes).** Produce `01-SCREEN-INVENTORY.md`: every screen/route,
its purpose, who uses it, how often; every primary component and what it renders; every
interactive element per screen (buttons, inputs, links, toggles, modals) and what it triggers.
Note which screens share `ContentListPage` / `EditPageShell` / `form-ux.tsx` — one shared
component fix lands on many screens at once.

**Phase 2 — UX audit (no code changes).** Produce `02-UX-AUDIT.md`. For each screen score 1–5 on:
hierarchy · spacing/alignment · consistency · feedback (loading/success/error) · form usability ·
table/data usability · navigation depth · mobile usability · accessibility. For each problem
write: Screen → Problem → Why it frustrates a human → Proposed visual fix → Risk (none/low/medium).
Sort fixes by impact ÷ effort. Only "Risk: none/low" items are implementable now.

## 5. Visual & layout standards to apply

### 5.1 Page structure (every screen)

```text
┌ Page header ──────────────────────────────────────┐
│ Title (h1)              [secondary]  [PRIMARY]    │
│ One-line description / breadcrumb / status chip   │
├ Body ─────────────────────────────────────────────┤
│ Grouped sections (cards), max width ~1120–1280px  │
│ Related fields together, 24–32px between groups   │
├ Sticky action bar (on long forms) ────────────────┤
│ [Discard]                      [Save draft][Publish] │
└───────────────────────────────────────────────────┘
```

- Title start-aligned, actions end-aligned, same vertical band. Never let the primary action float in the middle of the page.
- Long forms get a sticky bottom action bar (already exists: `FormStickyActions`) so "Save" is always reachable.
- Sidebar/nav: max 3 levels deep, current item visibly highlighted, section labels in small caps, active-state colour = primary. (Current shell already groups: Centre content / Research / Admin — keep.)
- Max content width so text lines never exceed ~90 characters. (`.cms-page-padding` caps at 72rem — keep; forms already narrow to max-w-3xl/4xl.)

### 5.2 Buttons

- Exactly one primary per view. Everything else is secondary/ghost.
- Verb-first labels that say the outcome: Publish post, Save changes, Invite user — not Submit/OK/Click here. (All copy via `labels.ts`, en + ar.)
- Danger variant reserved for destructive actions; destructive actions sit away from the primary (start side, or behind a "More" menu).
- Every button gets a loading state (spinner + disabled) while its request is in flight — no double submits. (`PublishButton` already does this — reuse its pattern.)
- Icon-only buttons get an accessible label/tooltip.
- Consistent heights: sm 32 / md 40 / lg 48 px; consistent icon size inside them. Minimum touch target 40×40 px on mobile. (Current shared buttons are min-h-11 = 44px — fine; document it.)
- Disabled buttons show why (tooltip), never silently greyed.

### 5.3 Forms

- One field per row by default; two columns only for short related pairs (First/Last, Start/End). (`.cms-form-grid` is 1col → 2col ≥640px; `.cms-form-stack` forces one column — use deliberately.)
- Label above the field, always visible (no placeholder-as-label). Placeholder = example, not instruction.
- Help text under the field in muted colour; error text replaces help text in danger colour, with an icon.
- Required marker convention: a single `*` plus one legend line, not asterisks on everything.
- Group into `<FieldGroup>`-style cards with a section title + one-sentence description (`FormSection` exists — extend, don't duplicate).
- Order fields: most-used first, rarely-touched settings collapsed into "Advanced settings" (`AdvancedDisclosure` exists — the move of a field into it is grey-zone, list first).
- Validation messages appear on blur and on submit, and the page scrolls to the first invalid field.
- Unsaved-changes guard: if the user navigates away with edits, they get a clear keep/discard prompt (visual only — reuse the existing guard if one exists).

### 5.4 Tables & lists

- Sticky header, sticky first column on wide tables, zebra or hover row highlight (pick one — the Desk currently uses hover; keep hover).
- Numbers right-aligned, dates in a consistent format, long text truncated with a tooltip.
- Status as a coloured pill with text, never colour alone (`StatusPill` exists).
- Column priority: on mobile, collapse to a card list rather than a horizontal scroll maze (`.cms-table-card-view` + `data-label` — already wired for content lists, recycle bin, import/export; extend to users, org-units, home editor matrix).
- Always present: sort on key columns (exists), a visible filter/search bar, result count (`HonestyCount` / `showingResults` exist), pagination or load-more with position preserved (exists).
- Row actions: max 3 visible, the rest in a ⋯ menu. Bulk select → bulk action bar appears (exists via `FormStickyActions`).

### 5.5 Feedback & states

- Loading: skeleton matching the real layout, not a centred spinner (`ListSkeleton` + `cms-skeleton` exist).
- Empty: icon + one sentence + the button that fixes it (`DeskEmptyState` exists — audit it always offers the fix action).
- Error: what happened, what to do, and a Retry button. Never a bare stack trace (`FormBanner` exists).
- Success: toast, auto-dismiss ~4s (`cms-toast` exists), and for destructive-but-reversible actions include an Undo where the data flow allows.
- Destructive confirm: modal that names the exact object ("Delete …?"), states the consequence, requires typing the name for permanent/bulk deletes (recycle-bin purge already does this — reuse its pattern).

### 5.6 Accessibility & responsiveness

- Contrast ≥ 4.5:1 for text, ≥ 3:1 for UI borders and icons.
- Visible focus ring on every interactive element; logical tab order matching visual order.
- All form fields labelled and associated; all images with meaningful alt; modals trap focus and close on Esc.
- No hover-only affordances; no icon-only meaning.
- Layouts must survive 375px → 1920px without horizontal scrolling (except wide data tables, which scroll inside their container).
- RTL: everything mirrored correctly in AR — logical properties only.

### 5.7 Motion & polish

## 6. Output files you must create

| File | Contents |
|------|----------|
| `docs/ux/01-SCREEN-INVENTORY.md` | Screens, components, interactive elements |
| `docs/ux/02-UX-AUDIT.md` | Scored problems + proposed fixes + risk rating |
| `docs/ux/03-PLAN.md` | Ordered change plan: screen → change → risk → effort |
| `docs/ux/04-CHANGELOG.md` | Per commit: what changed, which screen, why |
| `docs/ux/05-VERIFICATION.md` | The checklist in §7, filled in with real results |
| `docs/ux/DESIGN-NOTES.md` | Tokens, button rules, component usage rules |
| `docs/ux/RECOMMENDATIONS.md` | Anything you wanted to change but couldn't, because it touches behaviour |

## 7. Verification gate — you are not done until this is true

For every screen you touched, report:

- [ ] Feature inventory before the change (list) vs after (list) — identical.
- [ ] Every input still has the same name/id and still submits the same payload keys.
- [ ] Every button still fires the same handler; nothing was unwired.
- [ ] App builds clean: `cd cms && npm run build` → paste the tail of the real output.
- [ ] Tests pass: `cd cms && npm test` → paste the summary line, including counts.
- [ ] Lint/typecheck pass: `cd cms && npm run lint` → paste real output.
- [ ] Manually exercised the screen: created, edited, saved, deleted, filtered, paginated.
- [ ] Checked the 5 states (loading/empty/error/success/no-permission) and 4 widths (≥1440 / 1024 / 768 / 375) in AR-RTL **and** EN-LTR.
- [ ] Zero new console errors or warnings introduced.
- [ ] Each change sits in its own revertable commit with a message like `ux(media): group filters, sticky toolbar` (prefix mapping below).
- [ ] i18n: no new hard-coded strings — all copy via `labels.ts` `{ en, ar }`.

Commit prefix mapping (repo uses Conventional Commits): use `feat: ux(media): …`-style
Conventional Commits, e.g. `fix: ux(media): group filters, sticky toolbar` or `refactor: ux(news): …`.

If any box is unchecked, say plainly which one and why. Never describe a change as "done"
when the only thing you ran was a syntax check — name the code path you actually exercised.

## 8. Rollback & risk control

- One logical change per commit → any single visual change can be reverted alone.
- Keep the diff additive where possible (new wrapper div, new class) rather than rewrites.
- If a component is used in more than one screen, check every usage before restyling it, and list them in the changelog.
- Before starting: confirm the repo is clean and on the agreed branch (`feature/cms-ux-refresh`). If not, create it.

## 9. Your first reply to me

Don't start editing. Reply with:

1. Confirmation of the stack and the command you'll use to run/build/test (run it once and show output).
2. The `01-SCREEN-INVENTORY.md` content.
3. The top 10 highest-impact / lowest-risk fixes from the audit, ranked, each in one line.
4. Any question where my answer would change your plan.

Then wait for my "go" before Phase 3.


- Transitions 120–200ms ease-out on hover/focus, 200–250ms for panels/modals. Nothing over 300ms (existing `cms-*` animations are 220–420ms; audit and clamp).
- Respect `prefers-reduced-motion` (existing guard — keep it).
- Consistent radius and shadow per component type — pick from the token scale, never one-off values.

**Phase 3 — Design system foundation (one commit).** Consolidate the existing `--crs-*` tokens
and `cms-ui.ts` strings (do NOT fork a second system): spacing scale (4px base), radius scale,
shadow scale, type scale (page title / section title / body / caption / label, one weight per
level), colour roles (primary, on-primary, surface, border, muted, success, warning, danger,
focus-ring), button variants (primary / secondary / ghost / danger / icon-only) with one
documented rule for when each is used. Document in `DESIGN-NOTES.md`.

**Phase 4 — Implement, screen by screen (one commit per screen).** Start with the
highest-traffic screen (likely `/dashboard/news` list, then the shared edit form). For each:
re-run the app and open the screen; apply approved fixes; check all five states (default ·
loading · empty · error · success); check desktop and mobile (≥1440, 1024, 768, 375) in **both
AR-RTL and EN-LTR**; run build + tests + lint and report actual output; write 3–8 bullets into
`04-CHANGELOG.md`. Never edit five screens in one pass.

**Phase 5 — Report.** Fill `05-VERIFICATION.md` (§7) and hand over `03-PLAN.md` leftovers +
`RECOMMENDATIONS.md`.
5. Fix the workflow order — steps in the order a human would actually perform them.
6. Make every state visible — loading, empty, error, success, no-permission.
7. Never break a feature. If a fix requires changing behaviour, you propose it, you don't do it.
  `/dashboard/recycle-bin`, `/dashboard/featured-news`, `/dashboard/import-export`,
  `/dashboard/notifications`, `/dashboard/audit`, `/dashboard/site-pages`, `/dashboard/director`,
  `/dashboard/profile`, `/dashboard/preview/[token]`, `/login`.
- **Known pain points:** long content forms (news/event ~40+ fields in one scroll, workflow
  order unclear); admin managers (users, org-units) render bespoke layouts instead of the shared
  shells; users/org-units/home editor-matrix tables still horizontal-scroll on mobile (no card
  view); media library has no filter/search by bucket or type; buttons frequently equal weight;
  some success/error feedback inconsistent; recycle-bin + import/export card-view just landed
  (unverified on devices).
- **Users:** non-technical editors and reviewers at a public research centre — Arabic-first
  (RTL) UI with English toggle; four-eyes editorial workflow (draft → review → publish); some
  staff have narrow desk scopes (own content only).
  it — matches the §5.1 standard; keep it.
- **Known state today (2026-09-17):** `cms` tests 137/137 pass, SPA tests 40/40, lint has 9
  pre-existing problems, build blocked by the pre-existing type errors (see pre-task above).
