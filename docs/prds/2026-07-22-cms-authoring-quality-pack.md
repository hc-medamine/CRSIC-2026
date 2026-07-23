# PRD: CMS authoring quality pack (preview, editor, SEO, EN queue) / حزمة جودة التحرير في نظام إدارة المحتوى

| Field | Value |
|-------|--------|
| Status | **Approved** |
| Date | 2026-07-22 |
| Author | Product discovery (CRSIC 2026) |
| Owners | _(to be assigned — CRSIC + implementing team)_ |
| Related roadmap step | Step 4 — Internal CMS (post Phase 3 polish) |
| Supersedes | — |
| Related | [2026-07-19-internal-content-management.md](./2026-07-19-internal-content-management.md) (parent, **Approved**), [data/CMS.md](../../data/CMS.md), [docs/WORKLOG.md](../WORKLOG.md), [docs/prds/TEMPLATE.md](./TEMPLATE.md) |
| Parent CMS status | Phases 1–3 + RBAC polish on `main`; malware postponed to go-live |
| Approved | 2026-07-22 — stakeholder locked §10 decisions |

**Document rule:** Facts confirmed in discovery are unmarked. Items that are not yet verified are labeled **Assumption**, **Open question**, or **Proposed**.

**Ambiguity policy (inherited from parent PRD, 2026-07-20):** When anything is unclear or undecided, **stop and prompt the stakeholder for an explicit decision**. **Never assume. Never apply a default or “labeled default” without that prompt.**

---

## 1. Problem

### Problem statement

CRSIC’s internal CMS can take news, events, publications, partners, and alerts from draft → review → publish into the public JSON contract. That path is **functionally complete**, but four quality gaps remain for day-to-day institutional use:

1. **No public-faithful preview** — Reviewers approve from CMS forms; they cannot see the item rendered in the real SPA before JSON is written. Broken layouts, empty bodies, or bad media often surface only after publish (then emergency unpublish / post-review).
2. **Hard long-form authoring** — `body_ar` / `body_en` exist, but the editing UX is still closer to plain fields than a safe rich editor. Filling public detail pages stays slow; many live cards still have empty `body` / `summary`.
3. **Weak SEO / share metadata** — Slugs exist; dedicated share/SEO fields (meta title, description, Open Graph) are not first-class in the CMS → public discoverability and link previews are inconsistent.
4. **Invisible English debt** — AR-first publish with `en_status = pending` is locked and correct, but there is no operational queue that lists live (or in-flight) items still missing English. EN can stay pending forever with no dashboard signal.

These gaps were selected as the **highest-benefit** slice from an industry CMS feature comparison (Acquia / HubSpot / Upwork) filtered for CRSIC’s institutional hybrid model — not a marketing DXP.

### Who feels it

| Actor | Pain |
|-------|------|
| Reviewers / Super Admin | Approve without seeing visitor rendering |
| Editors / communications | Long Arabic/English bodies are painful to produce |
| Public visitors (indirect) | Thin detail pages; weak search/share cards |
| Communications lead | Cannot see which published items still lack EN |

### Confirmed context (inherited)

- Team size: **3–5** people; Editors and Reviewers usually different people.
- Public site: static SPA + `CONTENT_BASE_URL` JSON ([data/CMS.md](../../data/CMS.md)).
- **AR authoritative**; EN optional for publish; no email features; manual Approve → Publish only (scheduled publish **cancelled**).
- No external/SaaS CMS product; Algeria residency at go-live.
- Parent PRD remains the system of record for roles, workflow, and publish pipeline.

---

## 2. Goals

### Goals (this pack)

1. A Reviewer or Super Admin can **preview** an item as the public SPA would show it **before** promoting it to live public JSON.
2. Editors can author **long-form AR/EN bodies** (news, events, publications at minimum) with a **safe** rich editor that does not break the SPA or introduce XSS.
3. Editors can set **SEO / share metadata** (title, description, OG) per item; publish writes fields the public site can consume.
4. The dashboard exposes an **English-pending queue** so bilingual debt is visible and actionable **without** a Translator role or auto-translate product.
5. All four capabilities remain **role-gated**, **audit-logged**, and compatible with existing ownership rules (editors: own items; reviewers/SA: centre-wide).

### Non-goals (this pack)

- Translator role, machine translation, or AI auto-publish of EN.
- Full enterprise DAM, personalization, A/B testing, page builders, theme marketplaces.
- Reintroducing **scheduled auto-publish**.
- Email notifications for EN debt or preview links.
- Rewriting the public SPA to a dynamic headless API.
- Partners/alerts rich-body parity unless explicitly extended after news/events/pubs (**rich body stays news/events/pubs only; SEO includes partners/alerts — locked S2**).
- Production malware scanning (remains **go-live** track from parent Phase 2 #5).
- Full site staging infrastructure as a permanent second production (preview is **A1** token, not A2 staging).

---

## 3. Users & roles

| Role | Needs from this pack |
|------|----------------------|
| **Editor** | Rich body + SEO fields on own items; see own EN-pending queue; optional own-item preview |
| **Reviewer** | Preview before approve/publish; see all EN-pending; edit SEO/body when managing items |
| **Super Admin** | Same as Reviewer + overrides; audit of preview/publish/SEO/EN-ready actions |

No new MVP roles. Translator remains parent-PRD backlog.

---

## 4. Scope — four workstreams

### A. Public preview / staging before publish

**Intent:** See the **real SPA** (or SPA-faithful render) for an item before live JSON update.

**Must have**

1. From an item detail (at least `submitted` / `approved` / draft-with-content), authorized users can open **Preview**.
2. Preview shows the public detail route shape for that type (`#news/{slug}`, `#event/{slug}`, `#publication/{slug}`) using **non-live** data for that item.
3. Preview does **not** mutate public `data/*.json` or production `live_payload`.
4. Action is audit-logged (e.g. `*.preview`).

**Should have**

5. Preview available for Editors on **own** items; Reviewers/SA on items they can view.
6. Clear banner: “Preview — not live.”

**Nice to have**

7. Side-by-side “live vs candidate” for items that already have `live_payload`.

**Proposed approaches (pick one — Open question)**

| Option | Description |
|--------|-------------|
| **A1 — Draft preview token** | CMS serves a signed, short-lived preview payload; SPA loads it via a query/hash preview mode. |
| **A2 — Staging JSON snapshot** | Write candidate item into an isolated staging snapshot directory/URL not used by production `CONTENT_BASE_URL`. |
| **A3 — CMS-embedded SPA shell** | Embed/read public detail templates inside CMS with candidate fields (higher fidelity risk). |

**Locked (2026-07-22):** **A1 — Draft preview token.** A2 deferred as a later hardening option if list/rebuild bugs persist.


---

### B. Richer body editor (safe WYSIWYG / blocks)

**Intent:** Make long `body_ar` / `body_en` (and useful `summary_*`) practical to write.

**Must have**

1. Safe rich editing for **news, events, and publications** body fields (AR and EN) — **locked B2** (2026-07-22).
2. Output stored in DB and published into existing public `body` / bilingual body fields without breaking detail pages.
3. **Sanitization** allowlist — **locked H1** (2026-07-22): `p`, `br`, `strong`/`b`, `em`/`i`, `ul`/`ol`/`li`, `a[href]` only.
4. No arbitrary script/iframe/style injection; no headings/blockquote/images in MVP editor HTML (can extend later).
5. Works under existing RBAC (edit only when user may edit the item).

**Should have**

6. Paste-from-Word/Google Docs cleanup (strip junk spans).
7. Insert already-uploaded media attachments as **links** (not inline `img`) where useful — images stay via existing attachment/image fields.
8. Plain-text / HTML toggle for power users (**Proposed**).

**Nice to have**

9. Reusable block snippets (callout, quote) matching SPA CSS.
10. Same editor for partners/alerts if those gain long bodies later.
11. Extend allowlist to H2/H3 later if needed.

**Locked (2026-07-22):** Store as **sanitized HTML** compatible with current `body` strings. Partners/alerts out of rich-editor MVP.

---

### C. SEO / share metadata in CMS

**Intent:** Per-item control of search/share cards without a marketing stack.

**Must have**

1. CMS fields per **news, events, publications, partners, and alerts** item — **locked S2** (2026-07-22):
   - Meta / share **title** — public JSON: `meta_title` (bilingual `meta_title_ar` / `meta_title_en` where the type is bilingual)
   - Meta / share **description** — `meta_description` / `meta_description_ar` / `meta_description_en` as applicable
   - Open Graph image — `og_image` (optional; fallback to primary image / cover)
   - Field naming locked **F1** (2026-07-22).
2. Fields editable in create/edit forms; max lengths locked **L1** (2026-07-22): title **60**, description **160** (UI counters; reject or truncate on save — implement reject with clear error).
3. On publish, values appear in public JSON so detail pages / document head can use them.
4. Empty SEO fields → public site falls back to title/summary/image (no publish block).

**Should have**

5. Character counters in UI.
6. “Copy from title/summary” helper.

**Nice to have**

7. Twitter/X card parity if distinct from OG.
8. Per-language OG title/description when EN ready.

**Locked (2026-07-22):** S2 + F1 + L1. SPA head consumption → **P1** (same delivery as CMS fields).


---

### D. Translation linkage + EN-pending queue

**Intent:** Keep AR-first policy; make EN debt **visible** without a Translator product.

**Must have**

1. Dashboard queue **English pending**: items with `en_status = pending` and status **`published` only** — **locked D1** (2026-07-22).
2. Editors see **own** items; Reviewers/SA see all (same ownership pattern as other queues).
3. Item UI badge: `EN pending` / `EN ready`.
4. Completing EN fields and marking ready (or auto-ready when EN required fields filled) removes the item from the queue.
5. Queue is **non-blocking**: does not prevent AR publish/approve.

**Should have**

6. Filter by content type on the queue.

**Nice to have**

7. Count badge on dashboard / nav.
8. Bulk “still pending” export for SA (CSV) — no email.
9. **EN may be stale** indicator — **deferred (E2)**; not in this pack MVP.

**Locked (2026-07-22):** Queue membership **D1**; stale detection **E2** (deferred).

**Explicitly out**

- Dedicated Translator role UX.
- Auto-translate / AI EN publish without human edit.
- Splitting AR and EN into separate content items.
- EN stale detection in this pack (E2).

---

## 5. Requirements summary

### Must have (pack-level)

1. Preview that does not write live public JSON (workstream A).
2. Safe rich body editor for news/events/publications (workstream B).
3. SEO/share fields + publish into public contract (workstream C).
4. EN-pending dashboard queue + badges (workstream D).
5. RBAC + audit preserved; AR-first publish unchanged.
6. Docs: update [data/CMS.md](../../data/CMS.md) / WORKLOG when public fields change.

### Should have

1. Preview banner + editor paste cleanup + SEO counters + EN stale hint.

### Nice to have

1. Live-vs-candidate preview; block snippets; OG per language; EN queue badge counts.

---

## 6. Content / data impact

| Area | Impact |
|------|--------|
| `news.json` / `events.json` / `publications.json` / `partners.json` / `alerts.json` | Gain SEO/OG fields (`meta_title*`, `meta_description*`, `og_image`); news/events/pubs bodies may contain sanitized HTML richer than today |
| Locales | Unchanged for this pack |
| `CONTENT_BASE_URL` | Unchanged mechanism; preview must not point production consumers at draft data |
| DB | Possible new columns for SEO/OG; editor still uses `body_*`; optional `en_ready_at` / `ar_updated_at` for stale detection |

Any public field addition requires SPA consumption in the **same delivery** — **locked P1** (2026-07-22): CMS SEO fields + SPA `<head>` / share tags ship together.

---

## 7. UX notes

- Keep CMS chrome and queues consistent with current dashboard language (AR RTL / EN LTR).
- Preview: obvious **not live** chrome; deep-link back to CMS item.
- Editor: toolbar minimal; avoid “website builder” affordances.
- SEO: one compact field group under content, not a marketing dashboard.
- EN queue: same list pattern as “Awaiting review”; empty state explains AR-first policy.

Public-site branding rules still apply to anything visitor-visible (preview and live).

---

## 8. Technical notes

- Stack: existing Next.js CMS + PostgreSQL + publish rebuild helpers; public SPA unchanged architecture.
- Sanitization: server-side enforce on save/publish (never trust client HTML).
- Preview: prefer tokenized or isolated staging over mutating production `data/`.
- Feature branches until stable; merge to `main` only when smoke path green.
- No email; no new external SaaS editors that host content off Algeria policy without stakeholder lock.

**Suggested delivery order — locked O1 (2026-07-22)**

1. D — EN-pending queue (smallest, no public contract change)  
2. C — SEO fields (**P1:** CMS + SPA head/share wiring in the same delivery)  
3. B — Rich editor (authoring unlock)  
4. A — Preview token (highest integration risk)

---

## 9. Success metrics

| Metric | Pass |
|--------|------|
| Preview | Reviewer completes approve/publish after opening preview on a test item without writing live JSON until publish |
| Editor | Editor produces a multi-paragraph AR body for one news item without hand-editing JSON |
| SEO | Published item exposes meta title/description (or documented fallback) in public payload / page head |
| EN queue | At least one `en_status=pending` published item appears in queue; clearing EN removes it |
| Regression | Existing draft → review → publish smoke still green; AR publish with EN pending still allowed |
| Security | Attempted script injection in body is stripped/blocked on save |

---

## 10. Open questions (stakeholder)

All locked 2026-07-22:

1. ~~Preview~~ → **A1** (draft preview token); A2 later if needed.
2. ~~Rich editor~~ → **B2** (news+events+pubs) + **H1** allowlist.
3. ~~SEO~~ → **S2** + **F1** + **L1** (60/160).
4. ~~EN queue~~ → **D1** (`published` + `en_status=pending`).
5. ~~EN stale~~ → **E2** (defer).
6. ~~Delivery order~~ → **O1** (D → C → B → A).
7. ~~SPA SEO~~ → **P1** (CMS fields + SPA head/share in same delivery).

---

## 11. Decision log

| Date | Decision |
|------|----------|
| 2026-07-22 | Stakeholder selected this four-feature pack as high-benefit CMS follow-on (preview, rich editor, SEO/share meta, EN-pending queue) |
| 2026-07-22 | Pack excludes Translator role, AI auto-EN, scheduled publish, page builders, personalization, plugin/CRM marketplaces |
| 2026-07-22 | Preview approach → **A1** (draft preview token); A2 deferred |
| 2026-07-22 | Rich editor → **B2** (news+events+pubs) + **H1** allowlist (`p`, `br`, `strong`/`b`, `em`/`i`, `ul`/`ol`/`li`, `a[href]`); sanitized HTML |
| 2026-07-22 | SEO → **S2** (news/events/pubs/partners/alerts) + **F1** field names + **L1** (60/160); empty = fallback |
| 2026-07-22 | EN-pending queue → **D1** (`published` + `en_status=pending` only); non-blocking |
| 2026-07-22 | EN stale detection → **E2** (defer; pending/ready only in this pack) |
| 2026-07-22 | Delivery order → **O1** (D EN-queue → C SEO → B rich editor → A preview) |
| 2026-07-22 | SPA SEO consumption → **P1** (same delivery as CMS SEO fields) |
| 2026-07-22 | PRD status → **Approved** |

---

## 12. Mapping to parent PRD

| Parent theme | This pack |
|--------------|-----------|
| AR publish with EN pending | Preserved; D makes debt visible |
| Four-eyes + audit | Preserved; preview/editor/SEO actions audited |
| JSON publish contract | Extended carefully (SEO; richer `body`) |
| Phase 2 Translator / linkage | D is a **lite** linkage/queue only — not the full Translator role |
| Go-live malware / backups | Out of this pack (separate go-live track) |
