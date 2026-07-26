# PRD: SPA detail parity, preview extension, and media buckets

| Field | Value |
|-------|--------|
| Status | **Approved** |
| Date | 2026-07-26 |
| Author | Stakeholder + agent (audit Phase 3) |
| Owners | Product / CMS |
| Related roadmap step | Post–CMS Direction B — public/CMS parity |
| Decision memo | [../designs/2026-07-26-cms-parity-product-memo.md](../designs/2026-07-26-cms-parity-product-memo.md) |
| Supersedes | — |

## 1. Problem

CMS authors rich partner and research-group content, but the public SPA only shows list/card summaries (no detail hash routes). Preview tokens and emergency UI stop at news/event/publication, so four content types cannot be previewed like the rest. Media uploads are limited to three buckets (`news` / `events` / `covers`), so partners, alerts, and research cannot store first-class assets (logos, diagrams) in the library.

## 2. Goals

- Public visitors can open **partner** and **research group** detail pages from list cards (and via slug deep-link).
- Editors/reviewers can **preview** partner, alert, research_group, and research_project drafts the same way as news/event/publication (token → public SPA).
- CMS media library supports dedicated buckets for **partners**, **research**, and **alerts**, with ACL mapped to content-type scopes.
- Document that **emergency publish** remains news/event/publication only (intentional).

**Non-goals**

- Extending emergency publish to partner/alert/research (locked **Q2=A**).
- Journals CMS, static institutional pages (locales), crop/CDN media variants.
- Changing alert “at most one live” product rule.
- Soft-delete recycle bin for media (already shipped hard-delete with ref scan).

## 3. Users & roles

| Role | Needs |
|------|--------|
| Public visitor | Partner and research-group profiles; existing research-project detail unchanged |
| Editor / Reviewer | Preview all seven types; upload logos/diagrams into the right bucket |
| Super Admin | Same + bucket ACL via existing scopes |

## 4. Requirements

### Must have

1. **SPA detail — partners:** Hash route `#partner/{slug}` (or project-consistent naming); detail view from `partners.json` / preview payload; list cards link to detail.
2. **SPA detail — research groups:** Hash route `#research-group/{slug}`; detail from `research-groups.json` / preview; cards on research page link to detail; projects may continue to link to `#research-project/{slug}`.
3. **Router:** Extend `DETAIL_TYPES` (and detail renderer) for `partner` and `research-group`; keep alert as banner (no full detail page required for live browsing).
4. **Preview tokens:** Extend `PreviewContentType` + payload builders + CMS `PublicPreviewButton` to `partner`, `alert`, `research_group`, `research_project`.
5. **Alert preview:** Render as a clear preview of the site banner (not a fake detail article), still via `#preview/{token}`.
6. **Media buckets:** Add `partners`, `research`, `alerts` to DB CHECK + `MEDIA_BUCKETS` + library UI + `canAccessMediaBucket` → content-type map (`partner` / `research_group`+`research_project` / `alert`).
7. **Forms:** Partner / research / alert authoring can browse/upload in the matching bucket (primary image and/or `og_image` as fits each form — prefer real logo/diagram fields where the public detail shows them).
8. **Docs:** SMOKE + README note; emergency documented as **news/event/publication only**.

### Should have

1. Partner card emoji may remain; logo image preferred when present.
2. Research-group detail shows lead, summary, members (from published JSON).
3. In-CMS preview route (`/dashboard/preview/[token]`) supports the new types if the public SPA path does.

### Nice to have

1. Breadcrumb / back link from detail to cooperation or research parent page.
2. Shared `general` bucket — **out**; dedicated buckets chosen (Q4=B).

## 5. Content / data impact

| Surface | Change |
|---------|--------|
| `data/partners.json` | May gain image fields if publish builders emit logo/path (keep backward-compatible optional keys) |
| `data/research-groups.json` | Optional image / richer fields already mostly present — detail consumes them |
| `data/alerts.json` | Optional image only if product attaches media; banner contract stays |
| `img/cms/partners/`, `img/cms/research/`, `img/cms/alerts/` | New public media paths |
| Locales | Detail chrome strings (AR/EN) for new detail empty/error labels if needed |

Publish still rebuilds JSON from `live_payload`; no live public REST write API.

## 6. UX notes

- Public branding rules apply on new detail pages (one composition, brand-first, no card soup in hero).
- Partner/group list pages stay the discovery surface; detail is the deep-link/profile.
- Preview must not require login on the public origin; token secrecy unchanged (TTL 30m).
- Emergency panels: **no UI change** — leave only on news/events/publications.

## 7. Technical notes

- Suggested impl order: (1) media bucket migration + ACL, (2) SPA detail routes + publish field wiring, (3) preview type extension + buttons, (4) docs / smoke.
- SQL: widen `media_assets.bucket` CHECK; no change to emergency schema.
- Preview CHECK in `018_preview_tokens` / app types must allow the four new types (migration if DB CHECK is narrow).
- Reuse existing `build*Payload` helpers from publish modules for preview candidates.
- Auth on media unchanged (editor owns uploads; SA/reviewer centre-wide).

## 8. Success metrics

- From cooperation/research lists, visitor can open partner and research-group detail by slug.
- CMS edit pages for all seven types expose working public preview (alert = banner preview).
- Media library lists and accepts uploads in `partners`, `research`, `alerts`.
- Emergency still absent on partner/alert/research edit pages; documented as intentional.
- `npm test` / smoke checklists updated; feature-completeness re-audit shows preview 7/7 and SPA detail for partners/groups.

## 9. Open questions

- Exact public JSON keys for partner logo / research-group image (optional `img` vs reuse `og_image` only) — resolve in impl with minimal schema churn; prefer one clear field shown on detail.
- Whether research-group detail lists child projects inline (should-have default: yes, link to existing project detail).

## 10. Decision log

| Date | Decision |
|------|----------|
| 2026-07-26 | Memo lock: **Q3=B**, **Q1=B**, **Q2=A**, **Q4=B** (stakeholder chat) |
| 2026-07-26 | PRD drafted; **implementation blocked until Status = Approved** |
| 2026-07-26 | Stakeholder marked **Approved** — impl unlocked (buckets → SPA detail → preview) |
