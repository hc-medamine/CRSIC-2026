# PRD: Motion & interactivity polish (public SPA + internal CMS)

| Field | Value |
|-------|--------|
| Status | **Approved** |
| Date | 2026-08-18 |
| Author | OpenCode session (with stakeholder) |
| Owners | Stakeholder + OpenCode agent |
| Related roadmap step | Post-Step-4 polish — no new product surface, motion only |
| Supersedes | — |

> One slice, two surfaces: the public SPA already carries a motion system (`js/animations.js` + `css/style.css`); the CMS is essentially motion-free. This PRD adds a curated, brand-consistent motion layer to both. **Scope is strictly visual/interactive polish — no new content types, no routing changes, no schema changes.**
>
> **Draft v2 (2026-08-18)** — stakeholder Q&A decisions folded in: *showy everywhere*, M1 ships first, View Transitions API + fade fallback, all nice-to-haves kept, CMS stagger capped at 12 rows, OS-only motion gate, explicit performance budget, phase-by-phase validated merges.

## 1. Problem

- SPA navigation between hash pages is an instant section swap — no sense of travel; content exploration (filters, tabs, carousels, lightbox) works but feels flat.
- CMS is static: list rows, toasts, modals, publish button, and form validation appear/disappear without feedback, which makes the authoring flow feel unresponsive.
- Both apps must keep current guarantees: `prefers-reduced-motion` respected, transform/opacity only, RTL/LTR correct, zero new runtime dependencies, no layout shift.

## 2. Goals

- Make SPA page navigation and content exploration feel continuous and cohesive (view transitions, animated filters, card micro-interactions).
- Give the CMS's core daily flows tactile feedback: list enters, toasts, publish success, validation, modal/drawer, sidebar, skeletons.
- Ship in small phases, each independently smokeable, with zero regression to the ~5-min smoke checklist and RTL/LTR guide.
- **Showy but tasteful, everywhere** (stakeholder decision): hero runs full-strength effects (floaters, word reveal, gradient pan); cards/buttons get stronger lift, reveals, and hover glows — while content stays readable and fast.
- Meet an explicit performance budget (see §9) that gates every phase merge.

**Non-goals**

- No new JS/CSS libraries (no Framer Motion, GSAP, Anime.js, Lenis, etc.).
- No theme switching, configurable intensity, or per-user motion toggle (public Themes were **dropped** 2026-07-26; OS `prefers-reduced-motion` stays the only gate).
- No autoplay video, 3D models, cursor trails, confetti, or effects that compete with reading.
- No changes to `data/*.json` schema, locale key sets, or `CONTENT_BASE_URL`.
- No layout/redesign changes — animation only.

## 3. Users & roles

| Role | Needs |
|------|--------|
| Public visitor (AR/EN, desktop + touch) | Engaging but unobtrusive transitions; motion on content cards, tabs, carousel, lightbox, page changes |
| Visitor with `prefers-reduced-motion` | Zero motion — all effects must fully collapse |
| CMS staff (editor / reviewer / super admin) | Clear feedback on row enters, toasts, publish success, validation, modals, sidebar; AR/EN + RTL/LTR correct |

## 4. Requirements

### Must have

**SPA — navigation & exploration (M2–M3)**
1. View transitions between hash-routed pages — crossfade + directional slide via the CSS View Transitions API, with a no-API fallback (plain fade) for older browsers.
2. FLIP-animated reflow of the publications grid on filter/search changes (cards glide to their new position; no layout thrash).
3. Drawer + lightbox open/close spring-in with backdrop blur; Escape/close returns cleanly (keep `a11y.js` focus-trap contract).
4. Research/events tab indicator morph — animated sliding pill under the active tab (extends `updateTabIndicator`).
5. Home pub carousel affordance: paging-dot progress + drag-scroll cue, RTL-aware.
6. Hero ambient floaters: 2–3 translucent gold geometric shapes drifting slowly (reuse `geoSpin`-style keyframes), `pointer-events: none`.

**SPA — card & micro-interactions (M1)**
7. Card cover zoom on hover + one-pass gold shine sweep (pub/journal/news cards).
8. Touch press-scale (`scale(0.98)`) on cards and CTA rows for mobile tactility.
9. Hero headline word-by-word reveal (same pattern as the About director block) — full-strength per showy-everywhere.
10. Scroll-driven gold gradient pan on section headings (full-strength sweep on reveal, then settles).
11. Stronger card/button motion everywhere: deeper hover lift + shadow + glow ring on pub/journal/news/partner cards and primary CTAs (extends existing tilt/magnetic effects).

**CMS — daily flows (M1–M4)**
11. List/table rows enter with a subtle fade+slide stagger — **capped at 12 rows** (long queues fade in without per-row stagger).
12. Toasts slide in/out with an auto-dismiss progress bar (toasts exist — add motion).
13. Publish button state machine: idle → spinner → gold checkmark pop.
14. Sidebar active pill + collapsible group transitions.
15. Modal/drawer spring-in + backdrop blur.
16. Form validation shake + focus-ring glow on required fields.
17. List skeletons while content loads (align with SPA skeleton pattern).
18. Sticky action bar casts a shadow on scroll (edit pages).

### Should have

- Card hover elevation (translate + shadow) consistent with existing `.pub-card`/`.journal-card` tilt.
- Lightbox drag/swipe between images on touch.

### Nice to have

- Gentle floating on partner/director portrait blocks.
- Section title draw refinement (existing `.section-title` underline) — gradient tip.
- CMS empty-state illustration pulse (very subtle).

## 5. Content / data impact

- **None.** No `data/*.json` field changes, no locale key changes, no `CONTENT_BASE_URL` change.
- **Zero i18n churn confirmed** — OS `prefers-reduced-motion` is the only off-switch (no in-site motion toggle, no new AR/EN keys).

## 6. UX notes

- **Showy everywhere** (stakeholder): hero + cards + buttons get full-strength effects; lists/tables stay restrained. Public site branding keeps CSS variables (`--green-deep #1B4332`, `--green-mid #2D6A4F`, `--gold #C9A84C`) and Amiri/Tajawal rhythm; motion must not slow content load or reading.
- Direction awareness: all X-translations mirror in RTL (`translateX` sign flips; scroll-snap and progress bars already handle `dir`).
- Every animated element must be fully static when `prefers-reduced-motion: reduce` — verified per element in the smoke checklist (both apps already ship the guard).
- CMS: respect `crs-*` tokens; keep WCAG focus ring (`--crs-accent`) untouched by effects.

## 7. Technical notes

- **SPA:** vanilla ES modules. Extend `js/animations.js` (new init fns + `refreshMotionReveals`-style re-binding after dynamic renders) and `css/style.css` keyframes. View Transitions API via `document.startViewTransition` with feature-detection; fallback = existing fade.
- **CMS:** Next.js 16 App Router + Tailwind 4. Prefer Tailwind utilities + small CSS keyframes in `globals.css`; no new packages. Publish-button state machine lives in the existing form submit component.
- Both: IntersectionObserver-driven (SPA) / `:where` + observer (CMS); rAF-throttled scroll handlers; `will-change` applied sparingly and removed after animation.
- No codegen, no migrations, no env changes.

## 8. Delivery phases (each independently smokeable)

| Phase | Surface | Contents | Exit gate |
|-------|---------|----------|-----------|
| M1 | Both | Zero-risk CSS polish: card hover zoom+shine, deeper card/CTA hover lift + glow, touch press-scale, CMS row enter stagger (cap 12), toast motion, sticky-action shadow, form focus glow/shake | SMOKE A–D + RTL-LTR + `npm test` + **stakeholder local approval** |
| M2 | SPA | View transitions, drawer/lightbox spring + blur, tab morph, carousel paging dots | SMOKE A–D + RTL-LTR + `npm test` + **stakeholder local approval** |
| M3 | SPA | FLIP publications filter, hero floaters, headline word reveal, heading gradient pan | SMOKE A–D + RTL-LTR + `npm test` + **stakeholder local approval** |
| M4 | CMS | Publish checkmark pop, sidebar pill/collapse, modal spring, list skeletons | SMOKE-CMS §A–I + `cms npm test` + **stakeholder local approval** |

**Merge gate (mandatory):** each phase lands on its own `feature/motion-*` branch. Merge to `main` only after the stakeholder validates it on a local serve — SPA via `npm run spa` (:5500), CMS via `npm run dev` (:3000) — and the phase budget below is met. Phase-by-phase, never batched, never direct-to-`main`.

## 9. Success metrics & performance budget

**Functional**
- Full smoke checklist (`docs/qa/SMOKE.md`) and CMS smoke (`docs/qa/SMOKE-CMS.md`) pass per phase — no regressions.
- `prefers-reduced-motion: reduce` renders all new surfaces static (verified in QA).
- SPA unit tests still green (`npm test`, 7/7).
- RTL-LTR guide (`docs/qa/RTL-LTR.md`) re-verified after each SPA phase.

**Performance budget (gates every phase merge, measured on local serve)**
- No CLS regression: no layout-shift caused by animation start/end (transform/opacity only).
- Smoothness: 60 fps — no sustained dropped frames while animations run (rAF-throttled; IO-driven).
- Payload: **+0 JS bytes** from new libraries (none added); CSS additions measured but small.
- Lighthouse (desktop, local serve) ≥ **90 Performance** per phase; do not regress baseline.
- `will-change` used sparingly and removed once the animation settles.

## 10. Open questions — resolved (2026-08-18 Q&A)

| # | Question | Decision |
|---|----------|----------|
| 1 | Intensity | **Showy / impressive** — showy everywhere (hero full-strength; cards/buttons stronger) |
| 2 | Phase order | **M1 first** (both apps), then M2 → M3 → M4 |
| 3 | View Transitions API | **Yes** — API + plain-fade fallback for older browsers |
| 4 | Nice-to-haves | **Keep all three** (lightbox swipe, portrait float, empty-state pulse) |
| 5 | CMS row stagger on long lists | **Subtle stagger, capped at 12 rows** |
| 6 | Motion off-switch | **OS `prefers-reduced-motion` only** — no in-site toggle, no new i18n keys |
| 7 | Where "showy" applies | **Everywhere** (not just hero) |
| 8 | Performance budget | **Explicit** (see §9) — gates each merge |
| 9 | Merge cadence | **Phase-by-phase, validated merges** via feature branches + PR |
| 10 | Validation method | **Local serve** — stakeholder clicks through SPA :5500 / CMS :3000 and approves |

## 11. Decision log

| Date | Decision |
|------|----------|
| 2026-08-18 | Stakeholder requested all suggested effects in one slice. PRD drafted as **Draft**. No code until **Approved**. |
| 2026-08-18 | Q&A locked 10 decisions (above) folded into Draft v2. Status remains **Draft** until stakeholder's final approval. |
| 2026-08-18 | **Branch-only rule (mandatory):** never commit to `main` directly — merge only after stakeholder validation (recorded in `AGENTS.md` + README §5.3). |
| 2026-08-18 | Stakeholder **approved Draft v2** → status **Approved**. Implementation may begin (M1 first, on `feature/motion-*` branches, phase-by-phase validated merges). |

## 12. Item backlog (source of truth for implementation)

### SPA
- [ ] View transitions between hash pages (crossfade + directional slide; fade fallback)
- [ ] Publications filter/search FLIP reflow
- [ ] Drawer + lightbox spring-in with backdrop blur
- [ ] Tab indicator morph (sliding pill)
- [ ] Home pub carousel paging dots + drag cue (RTL-aware)
- [ ] Hero ambient gold geometric floaters
- [ ] Card cover zoom + gold shine sweep
- [ ] Deeper card/CTA hover lift + glow ring (extends tilt/magnetic)
- [ ] Touch press-scale on cards/CTAs
- [ ] Hero headline word-by-word reveal
- [ ] Section heading gold gradient pan
- [ ] Lightbox swipe between images (touch)

### CMS
- [ ] Dashboard list/table row enter stagger (cap 12 rows)
- [ ] Toast slide-in/out + auto-dismiss progress bar
- [ ] Publish button spinner → gold checkmark pop
- [ ] Sidebar active pill + collapsible groups
- [ ] Modal/drawer spring-in + backdrop blur
- [ ] Form validation shake + focus-ring glow
- [ ] List skeletons while loading
- [ ] Sticky action-bar scroll shadow
- [ ] Empty-state illustration pulse

### Cross-app
- [ ] Partner/director portrait gentle float