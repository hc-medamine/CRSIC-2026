# PRD: Laws/Platforms CMS parity, cutover & Director CMS

| Field | Value |
|-------|--------|
| Status | **Approved** |
| Date | 2026-07-27 |
| Author | Stakeholder + agent |
| Owners | Product / CMS / Public SPA |
| Related roadmap step | Close gaps from [2026-07-27-spa-laws-platforms-home.md](./2026-07-27-spa-laws-platforms-home.md) |
| Supersedes | — (amends non-goal: Director CMS CRUD) |

## 1. Problem

Laws and platforms are CMS-typed but thinner than News: no attachments UI, optional `externalUrl` never surfaces on the SPA, and seed JSON can be wiped on first publish. The About “director’s word” is still locale/placeholder HTML with no CMS path, so editors cannot update quote, name, role, or portrait without a deploy.

## 2. Goals

- Editors attach gallery media on laws and platforms the same way as News; SPA already renders `media[]`.
- Visitors see an optional secondary “More information” / “المصدر” link when `externalUrl` is set (never a primary CTA).
- Seed laws/platforms are imported into CMS as **published** rows with `live_payload` so the next publish rebuild preserves the catalog.
- Super Admins and **centre-wide Reviewers** manage Director word (bilingual quote/name/role + portrait) in CMS; SPA About reads published JSON.

**Non-goals**

- Journals in CMS (stay OJS / `data/journals.json`).
- Full About / org / contact / cooperation body pages in CMS (locales + static HTML remain).
- Escalate / ReviewOwner / editable public-slug panels on law/platform (parity deferred).
- Changing About layout beyond swapping data sources for the existing director block.
- Scraping WordPress for director copy.

## 3. Users & roles

| Role | Needs |
|------|--------|
| Public visitor | Law/platform detail with media + optional secondary link; real director greeting on About |
| Editor (law/platform) | Attachments on forms; set optional external URL |
| Centre-wide Reviewer | Edit + publish Director word (with SA) |
| Super Admin | Director word; run/approve cutover; scopes |

## 4. Requirements

### Must have

1. **Attachments UI:** `MediaAttachmentsField` on law and platform create/edit forms; create/update APIs persist `attachments`; publish continues mapping to SPA `media[]`.
2. **SPA `externalUrl`:** On `#law/{slug}` and `#platform/{slug}`, if `externalUrl` present, show one secondary text link labeled via locales (`More information` / `المصدر`). Not a card CTA; not required to publish.
3. **Cutover import:** Idempotent script (slug-keyed) imports current `data/laws.json` and `data/platforms.json` into `content_items` as **published** with populated `live_payload` under `centre_wide`; safe to re-run without duplicates.
4. **Director CMS:** Singleton (or equivalent) editable in dashboard by **super_admin** and **reviewer** users who hold **centre_wide** org scope.
5. **Director fields:** `quote_ar`, `quote_en`, `name` (or name_ar/name_en if needed), `role_ar`, `role_en`, portrait via CMS media bucket; separate AR/EN quotes required.
6. **Director publish:** Write public artifact SPA loads (e.g. `data/director.json`); About block stops depending on locale keys / hardcoded `img/Holders/0.jpg` for live content (locales may remain as fallback until first publish).
7. **Media bucket:** Dedicated or shared institutional bucket for director portrait (e.g. `site` / `covers` — implementer’s choice documented in `data/CMS.md`).
8. **Contract docs:** Update `data/CMS.md` for `externalUrl` visitor behavior and `director.json` (or chosen path).

### Should have

1. Fix law/platform detail parent nav to highlight Laws / Platforms (not Home).
2. Seed empty director record from current locale placeholders on first migrate/import so About never blanks.

### Nice to have

1. Image alt on director portrait in CMS.
2. Preview of director block before publish (optional).

## 5. Content / data impact

| Surface | Change |
|---------|--------|
| `data/laws.json`, `data/platforms.json` | Preserved via DB import; rebuild from CMS thereafter |
| `data/director.json` (proposed) | New publish target for About director block |
| `data/locales/ar.json`, `en.json` | Link label keys for external URL; director keys become fallback-only or removed after cutover |
| `data/CMS.md` | Document director + secondary link |
| CMS media | Director portrait bucket; law/platform attachments use existing laws/platforms buckets |
| SQL | Any singleton table / constraints for director; no journals/About page tables |

## 6. UX notes

- Law/platform detail: secondary link sits below body/media; subdued text link, not gold primary button.
- Director CMS: simple settings-style form (not a full content workflow queue unless reuse is cheaper); publish explicit.
- About: keep existing `.director-word` composition; only data binding changes.

## 7. Technical notes

- Reuse News attachments field + publish helpers where possible.
- Import script under `cms/scripts/`; mark items published with `live_payload` matching public JSON shape.
- Director auth: `role === 'super_admin'` OR (`role === 'reviewer'` AND org includes `centre_wide`).
- Feature branch: `feature/laws-platforms-parity-director-cms` (or continue current branch if stakeholder prefers).

## 8. Success metrics

- After import, CMS list shows all seed laws/platforms; publish does not drop catalog items.
- Editor can attach ≥1 media item on platform/law and see it on SPA detail.
- Item with `externalUrl` shows “المصدر” / “More information” on SPA; without URL, no link.
- Centre-wide Reviewer and SA can update director quote/portrait; visitor About reflects publish without SPA redeploy of locales.
- Journals and About body copy unchanged and still non-CMS.

## 9. Open questions

- _(none locked)_ Implementer may choose director storage: dedicated table vs `content_items` singleton type `director` — prefer simplest auth + publish path.

## 10. Decision log

| Date | Decision |
|------|----------|
| 2026-07-27 | Include: attachments UI, SPA secondary `externalUrl`, seed cutover as published+live_payload, Director CMS |
| 2026-07-27 | Director editors: **Super Admin + centre-wide Reviewer** (not centre-wide Editor) |
| 2026-07-27 | Director languages: **separate** AR/EN quote (and role) |
| 2026-07-27 | Portrait: **CMS media bucket** |
| 2026-07-27 | Cutover: **already-published** with `live_payload` |
| 2026-07-27 | `externalUrl` label: generic **More information** / **المصدر** (locale keys, not free-text CMS label) |
| 2026-07-27 | **Out of scope:** Journals in CMS; About/org/contact body pages in CMS |
| 2026-07-27 | **Out of scope:** Escalate / ReviewOwner / public-slug editors on law/platform |
