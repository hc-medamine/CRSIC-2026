# PRD: CMS Direction B visual system / نظام المظهر البصري لإدارة المحتوى (الاتجاه B)

| Field | Value |
|-------|--------|
| Status | **Approved** |
| Approved | 2026-07-23 — stakeholder Approve in chat |
| Date | 2026-07-23 |
| Author | Product discovery (CRSIC 2026) |
| Owners | _(to be assigned — CRSIC + implementing team)_ |
| Related roadmap step | Step 4 — Internal CMS (visual polish after M1–M3) |
| Supersedes | — |
| Related | [2026-07-23-cms-navigation-authoring-ux.md](./2026-07-23-cms-navigation-authoring-ux.md) (IA/nav — remains source of truth for structure), [README.md §5.1](../../README.md#51-product-development-workflow-prd-first) |
| Samples | Direction B mockups under Cursor assets (`B-cms*.png`) — design reference only |
| Rollback | Git tag `stable/pre-cms-b-visual` on commit before this slice’s implementation merges |

**Document rule:** Locked decisions are unmarked. Open items labeled **Open question**. Status = **Approved** — implementation proceeds on `feature/cms-direction-b-visual`.

---

## 1. Problem

### Problem statement

CMS navigation and authoring UX (M1–M3) improved IA, but the visual chrome remains default zinc/utilitarian. Staff day-to-day experience lacks the clarity and calm of the agreed **Direction B (Soft modernize)** samples: airy white sidebar, deep green primary CTAs, clearer queue hierarchy, softer surfaces.

### Who feels it

| Actor | Pain |
|-------|------|
| Editor / Reviewer / SA | Chrome feels generic; primary actions compete with chrome noise |
| All | Inconsistent density vs the approved Home cockpit intent |

---

## 2. Goals

1. Apply **Direction B** visual tokens and component styles across CMS (login, chrome, Home, lists, forms, media, notifications, admin, profile).
2. Preserve **existing IA and RBAC** from the nav/authoring PRD — this slice is visual/system polish, not a nav redesign.
3. WCAG AA contrast for text/controls; focus rings visible; touch targets ≥44px on mobile chrome.
4. Ship on branch `feature/cms-direction-b-visual` with easy rollback to `stable/pre-cms-b-visual`.

### Non-goals

- Public SPA visual redesign (separate Themes track — see §8).
- New content types, RBAC changes, email/SMTP.
- Theme marketplace or runtime theme switching **inside** the CMS chrome (CMS stays on Direction B only).
- Pixel-perfect clone of exploratory mockup copy/labels (use real CRSIC i18n labels).

---

## 3. Users & roles

Unchanged from parent CMS PRDs. Visual system must work for Editor, Reviewer, and Super Admin role-grouped chrome.

---

## 4. Requirements

### Must have

1. **Design tokens** in CMS (`globals.css` / Tailwind theme): primary `#1B4332`, secondary `#2D6A4F`, accent `#C9A84C` (sparingly), background `#F7F6F2` / white surfaces, text `#1A2E26` / muted `#6B7C74`.
2. **Typography:** Geist (or current Next font) for UI; optional Amiri only if a rare display need appears (default: sans).
3. **Chrome:** Light/white sidebar (or equivalent rail), green active state (bar/bg), Admin block visually separated; mobile drawer/hamburger with ≥44px targets.
4. **Primary CTAs:** Deep green filled buttons for the single most important action per view (e.g. Open next review, Save/Submit, New item).
5. **Surfaces:** Soft borders / light shadow; cards only for interactive queue/list units.
6. **Screens covered:** Login, Home cockpit, content lists, content forms, media, notifications, profile, review actions, SA admin pages (users, org-units, editors, audit).
7. **a11y:** Visible focus, AA contrast, semantic structure retained.

### Should have

1. Subtle page transition / motion only where it clarifies hierarchy; respect `prefers-reduced-motion`.
2. Empty/error/success states restyled to match B (copy remains from nav PRD).

### Nice to have

1. Shared small component primitives (`Button`, `Surface`, `PageHeader`) if they reduce duplication without a large refactor.

---

## 5. UX / screens

Reference Direction B samples (conceptual): Home queues, news list/edit, events, publications, research, media, notifications, review detail, admin users, profile, mobile home, login.

IA labels and routes stay as implemented in M1–M3.

---

## 6. Decision log

| Date | Decision |
|------|----------|
| 2026-07-23 | Visual direction = **B Soft modernize** for **CMS only** |
| 2026-07-23 | Ship order = CMS B visual **first**; public Themes PRD **after** |
| 2026-07-23 | Rollback baseline = git tag `stable/pre-cms-b-visual` |
| 2026-07-23 | Public SPA unchanged in this PRD |

---

## 7. Rollout / rollback

1. Implement on `feature/cms-direction-b-visual`.
2. Smoke CMS login + Home + one list + one form + one admin page (desktop + mobile width).
3. Merge via PR when Approved + smoke green.
4. If issues: revert merge or `git checkout stable/pre-cms-b-visual` / reset feature branch; public site unaffected.

---

## 8. Deferred — Public SPA Themes (next PRD)

Locked stakeholder decisions for the **following** PRD (do not implement in this slice):

| Topic | Decision |
|-------|----------|
| Who | Super Admin only |
| Catalog | Default (current SPA) + A / B / C; upload/custom token JSON **later** |
| Preview | Preview theme before going live |
| Depth | Full look (layout / nav / hero composition), not tokens-only |
| Rollback | Instant switch back to **Current** (previous live theme) |
| Cache / CDN | Visitors see new theme **instantly or on page reload** |
| i18n | Theme names AR/EN in CMS |
| Depth Q1 | Full look |
| Ship order Q2 | CMS B visual first, Themes PRD after |

---

## 9. Open questions

_None. Approved 2026-07-23 — implementation on `feature/cms-direction-b-visual`._
