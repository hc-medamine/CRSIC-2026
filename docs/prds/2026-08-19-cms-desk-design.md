# PRD: CMS Desk — shell & dashboard visual redesign for novice users

| Field | Value |
|-------|--------|
| Status | **Approved** (2026-08-19) |
| Date | 2026-08-19 |
| Author | OpenCode session (with stakeholder) |
| Owners | Stakeholder + OpenCode agent |
| Related roadmap step | Post-Step-4 CMS polish — visual identity + usability, shell + dashboard only |
| Supersedes | — |

> One slice: redesign the CMS's global shell (`CmsChrome` layout wrapping all dashboard routes) and the dashboard home page into a calm, app-like, self-explanatory **"CMS Desk"** identity. **Scope is visual/UX redesign only — no new content types, no routing changes, no schema changes, no changes to public `data/*.json`.**
>
> **Draft v2 (2026-08-19)** — stakeholder Q&A resolved: distinct CMS identity (option B, codenamed **CMS Desk**), shell-wide scope, zero-dependency default (may be lifted only if necessary + agreed), manual stakeholder walkthrough per merge, novice users as first-class audience, motion gate = OS `prefers-reduced-motion` only (no calm-mode toggle), dashboard quick-stats row in scope, all nice-to-haves validated, SaaS-dashboard reference style.

## 1. Problem

- The CMS is functionally complete (Direction B tokens + motion primitives from PRDs 2026-07-23 / 2026-08-18) but the overall design still feels plain, dense, and uninviting — staff report it as "not attractive, catchy, intuitive, or user-friendly."
- The dashboard presents dense queue lists and role-gated cards with little guidance; a **novice user (little or no computer experience)** cannot tell where to start, what each section means, or whether an action succeeded.
- Current design does not motivate new tasks; there is no sense of workspace and no onboarding guidance.

## 2. Goals

- Make the CMS shell + dashboard visually attractive, calm, modern, and fluid — an app-like workspace distinct from the public site (keeps `--crs-*` palette as base), following modern SaaS-dashboard patterns.
- Make the dashboard **self-explanatory for novices**: obvious entry point, plain-language labels, guidance in empty states, visible feedback for every action.
- Add tasteful effects, animations, and transitions to the shell + dashboard — building on, never duplicating, the existing `globals.css` motion primitives.
- Keep AR/RTL-first correctness, all roles working, zero new content-type/schema/routing changes, and a zero-dependency default.

**Non-goals**

- No redesign of list/detail/edit pages beyond what the shared shell imposes (shell is global, so its chrome changes everywhere; page interiors are out of scope for this slice).
- No new dependencies by default; a dependency may only be added when justified in this PRD and agreed by the stakeholder.
- No changes to `data/*.json` schema, locale key sets, or `CONTENT_BASE_URL`.
- No auth, workflow, queue logic, or API changes.
- Deferred backlog stays out: pagination, bulk ops, scheduled publish, media crop, EN body parity, etc.
- No public SPA changes.

## 3. Users & roles

| Role | Needs |
|------|--------|
| Novice CMS user (editor, little computer experience) | Clear "what do I do next", plain labels, forgiving actions (undo/confirm), calm motion, help/guidance, no jargon |
| Regular editor / reviewer | Fast daily flows: review inbox, drafts, published; obvious status; low friction navigation |
| Super admin | Same calm workspace + admin sections (users, org units, audit) clearly separated |
| Arabic-first user (RTL, Bahij) | Full parity with the English experience; RTL-correct motion direction |
| User with `prefers-reduced-motion` | Zero motion — effects fully collapse (OS-only gate) |

## 4. Requirements

### Must have

**Shell (`CmsChrome`)**
1. **CMS Desk identity**: calmer surfaces, softer shadows, more whitespace, app-like header/brand block — visually distinct from the public site while keeping `--crs-*` tokens.
2. Plain-language, icon+text nav labels (never icon-only); tooltips/titles on icon-heavy areas; larger touch targets.
3. Shell redesign applies across all dashboard routes (global layout change), verified AR/RTL first.
4. Keep all existing nav structure (Centre Content / Research / utility / Admin groups, badges, user footer, lang toggle, mobile drawer) — reorganize visually, not semantically.

**Dashboard home**
5. A welcoming, guided cockpit: greeting + primary "continue where you left off" CTA + quick-create, replaced current dense queue grid with clearer hierarchy.
6. **Role-aware** home: editor / reviewer / super_admin see a tailored "today" layout (e.g. reviewer → review inbox first; editor → drafts + create).
7. Empty states that teach: "No items here yet — here's how to create your first news item" with a visible CTA.
8. First-run onboarding hint (dismissible) explaining the three key actions (create, review, publish) in plain words.
9. Visible feedback for every action: existing toasts stay; new queue counts animate subtly on load.
10. **Quick-stats row**: published / drafts / awaiting-review counts computed from existing queues (no new API).

### Should have

- Subtle page-level transition between dashboard routes (fade/slide), gated by OS `prefers-reduced-motion`.
- Queue cards with progress/count emphasis and clearer status colors (reuse existing `StatusPill` tones).
- Hover lift + focus glow consistent with existing SPA/CMS motion vocabulary.
- A short "help" affordance linking to the tip banner / onboarding.
- Search in the shell (nav filtering) for larger menus.
- Gentle ambient background (very subtle gradient/pattern) on the shell.

### Nice to have

- None — all previously proposed nice-to-haves were validated into scope by the stakeholder (2026-08-19).

## 5. Content / data impact

- **None.** No `data/*.json` field changes, no locale key changes, no `CONTENT_BASE_URL` change.
- **New i18n keys** in `cms` labels only: onboarding hint, help text, stats labels, any new dashboard strings. AR + EN key sets must stay in sync (follow `src/lib/i18n/labels.ts` pattern).

## 6. UX notes

- **CMS Desk feel**: calmer, more whitespace, softer shadows, flatter accents; distinct from the public SPA (which stays showy). The `--crs-*` palette (green `#1B4332`, gold `#C9A84C`, cream) remains the base. **Reference style: modern SaaS admin dashboards** (e.g. Stripe/Notion-like hierarchy: clear cards, obvious primary actions, muted utilities).
- **Novice-first**: every screen answers "what do I do now?"; plain-language labels; icon+text; large targets (min-h-11 already used); destructive actions get confirm/undo.
- **RTL-first**: all directional motion mirrors (`translateX` sign flips); Bahij font + `dir` handling already in place; verify via `docs/qa/RTL-LTR.md`.
- **Motion**: build on existing primitives in `globals.css` (toast, modal spring, shimmer, nav pill, row stagger). No layout shift (transform/opacity only). Motion gate is OS `prefers-reduced-motion` only — no in-app toggle (matches PRD 2026-08-18 decision #6).
- Keep WCAG focus ring (`--crs-accent`) and visible focus on all new interactive elements.

## 7. Technical notes

- **CMS:** Next.js 16 App Router + React 19 + Tailwind CSS 4. Changes live in `cms/src/app/dashboard/` (`cms-chrome.tsx`, `page.tsx`, `ui-bits.tsx`, `home-tip-banner.tsx`, `create-content-menu.tsx`) and `cms/src/app/globals.css`.
- Prefer Tailwind utilities + small CSS keyframes in `globals.css`; no new packages unless explicitly agreed (§2).
- No codegen, no migrations, no env changes.
- Verification: `cms npm run lint`, `cms npm test`, `cms npm run db:smoke` (needs `.env.local` + Postgres), plus manual `npm run dev` walkthrough.

## 8. Success metrics

- Stakeholder manually walks through the shell + dashboard (AR + EN) on `npm run dev` and approves before each merge.
- Full CMS smoke checklist (`docs/qa/SMOKE-CMS.md`) passes; no regressions in existing flows (auth, queues, create, preview, publish).
- `prefers-reduced-motion: reduce` renders all new motion static (verified in QA).
- No layout shift (transform/opacity only); no new runtime JS libraries.
- AR/EN key sets in sync; RTL-LTR guide re-verified.

## 9. Open questions — resolved (2026-08-19 Q&A)

| # | Question | Decision |
|---|----------|----------|
| 1 | Where should the calm-mode toggle live? | **Drop calm-mode toggle** — OS `prefers-reduced-motion` only (aligns with PRD 2026-08-18) |
| 2 | Quick-stats row on dashboard? | **Yes** — show stats (published / drafts / awaiting review), computed from existing queues |
| 3 | Shell search now or defer? | **Validate** — include shell search (nav filtering) in this slice |
| 4 | Reference style? | **Modern SaaS dashboards** (e.g. Stripe/Notion-like hierarchy, clear cards, obvious primary actions) |

## 10. Decision log

| Date | Decision |
|------|----------|
| 2026-08-19 | Idea captured (step 1): CMS design not attractive/intuitive; goal = attractive, beautiful, intuitive, user-friendly design with effects/animations/transitions; final users treated as novices. |
| 2026-08-19 | Scope locked (step 6): **option B — distinct CMS identity**, codenamed **CMS Desk**; **shell-wide** scope (all dashboard routes); **zero-dependency default** (may be lifted only if necessary + agreed); **manual stakeholder walkthrough** per merge. PRD drafted as **Draft**. No code until **Approved**. |
| 2026-08-19 | Open questions resolved → **Draft v2**: drop calm-mode toggle (OS `prefers-reduced-motion` only), dashboard quick-stats row in scope, all nice-to-haves validated (shell search, ambient background), reference style = modern SaaS dashboards. |
| 2026-08-19 | Stakeholder **approved Draft v2** → status **Approved**. Implementation may begin on `feature/cms-desk-design`, validated merges only. |

## 11. Item backlog (source of truth for implementation)

**Shell**
- [x] CMS Desk identity — surfaces, shadows, whitespace, header/brand block
- [x] Icon+text nav, plain labels, tooltips, larger targets
- [x] Global shell redesign across all dashboard routes, AR/RTL-verified
- [x] Shell search / nav filtering

**Dashboard**
- [x] Guided cockpit: greeting + primary CTA + quick-create hierarchy
- [x] Role-aware "today" layout (editor / reviewer / super_admin)
- [x] Teaching empty states with create CTA
- [x] Session-scoped toggleable onboarding hint (show/hide, never permanently dismissed)
- [x] Queue count load animation + status emphasis
- [x] Quick-stats row (published / drafts / awaiting review, from existing queues)

**Polish**
- [x] Page-level transition between routes (OS reduced-motion gated)
- [x] Hover lift + focus glow consistency
- [x] Help affordance → tip banner
- [x] Ambient shell background (subtle gradient/pattern)