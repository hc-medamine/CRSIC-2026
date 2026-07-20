# PRD: Internal Content Management App / تطبيق إدارة المحتوى الداخلي

| Field | Value |
|-------|--------|
| Status | Review |
| Date | 2026-07-19 |
| Author | Product discovery (CRSIC 2026) |
| Owners | _(to be assigned — CRSIC + implementing team)_ |
| Related roadmap step | Step 4 — Internal web app + database (no external CMS) |
| Supersedes | — |
| Related | [data/CMS.md](../../data/CMS.md), [README.md §10](../../README.md), [docs/prds/TEMPLATE.md](./TEMPLATE.md) |

**Document rule:** Facts confirmed in discovery are unmarked. Items that are not yet verified are labeled **Assumption**, **Open question**, or **Proposed**.

**Ambiguity policy (stakeholder-locked 2026-07-20):** When anything is unclear or undecided, **stop and prompt the stakeholder for an explicit decision**. **Never assume. Never apply a default or “labeled default” without that prompt.** Do not proceed on silent judgment calls.
---

## 1. Problem

### Problem statement

CRSIC’s public website is a static SPA that loads institutional content from UTF-8 JSON files (`news.json`, `events.json`, `publications.json`, etc.). Staff who need to publish news, events, and publication metadata today must edit those files (or ask someone who can). There is no authenticated interface, no review workflow, no version history, and no audit trail.

This creates operational risk for a public research centre under MESRS: slow updates, accidental broken JSON, unclear authorship, and no four-eyes control before content becomes public.

### Who feels it

| Actor | Pain today |
|-------|------------|
| Content editors / communications staff (primary) | Cannot publish independently; depend on file access or a technical intermediary |
| Reviewers / managers | No structured review queue or approval record |
| IT / webmaster | Manual JSON edits, deploy/cache risk, no permission model |
| Public visitors (indirect) | Stale or inconsistent information when updates lag |

### Confirmed context

- Trigger: roadmap goal (Step 4), not an ad-hoc request.
- Team size (first 6 months): **3–5** people who create or approve content.
- Editors and reviewers are **usually different people**.
- Journals remain on **OJS** (`https://crsic.dz/ojsre/`) — out of CMS ownership for journal issues/articles.
- Arabic may go live while English is still **pending**.
- Production target (when ready): same host as `crsic.dz`, data in Algeria.
- Logins are **greenfield** (no LDAP/AD).
- **No email-dependent features** (notifications, password reset, digests, invitations) — in-app / Super Admin only.
- Emergency publish bypass is **Phase 2**, not MVP.
- **Development:** all implementation work happens **locally** on the developer machine (Cursor Pro IDE; PostgreSQL **18.4-2** Windows x64). Go-live only after the product works with **zero friction / zero known bugs**.
- **Git:** implementation lives on branch `feature/step4-internal-cms`; merge to `main` only when fully functional.

### Current workaround (corrected)

**Assumption challenged and replaced:** the workaround is not “nothing.” Today content is maintained by editing static files under `/data` (and related images), optionally served via `CONTENT_BASE_URL`. See [data/README.md](../../data/README.md) and [data/CMS.md](../../data/CMS.md).

---

## 2. Goals

### Goals (MVP)

1. Authorized CRSIC staff can create, review, and publish **news**, **events**, and **publication metadata** without editing JSON by hand.
2. Every publish/unpublish path is **authenticated**, **role-gated**, and **audit-logged**.
3. Public site continues to consume the existing JSON contract (`CONTENT_BASE_URL`) with minimal visitor-facing change.
4. Arabic content can be published when ready; English can remain pending without blocking AR.
5. The publish path **works end-to-end**: staff can take news from draft → review → public site **without** hand-editing production JSON. A numeric “≥ N items” quota is **not** required (stakeholder choice 2026-07-19).

### Non-goals (MVP)

- Replacing or integrating **OJS** as the journal CMS.
- Managing the digital library / **OPAC**.
- Editing static marketing copy currently hard-coded via locales/HTML (About hero, org chart narrative, research department long copy) — unless explicitly pulled into CMS later.
- Third-party / external hosted CMS products (WordPress, etc.) as the product — conflicts with roadmap “no external CMS.”
- Emergency immediate-publish bypass.
- **Scheduled / timed auto-publish** (manual Approve → Publish only).
- **Any feature that requires email** (SMTP, mail invites, email password reset, email notifications/digests).
- Multi-step legal/comms dual approval chains.
- Partners, FAQs, tenders, photo galleries, homepage composition studio as first-class managed types.
- Enriching public news/publication **detail pages** beyond current SPA cards (tracked separately — see WORKLOG pending).
- Full malware scanning pipeline if host cannot provide it on day one (**risk** — see §12).
- Public-site rewrite to a dynamic API-first architecture.

---

## 3. Users & personas

### Organisational units (from official org page + site copy)

Source: [الإطار التنظيمي](https://www.crsic.dz/?page_id=165) and public-site org/locale content.

**Governance / support**

- المديرية (Directorate)
- مجلس الإدارة / المجلس العلمي (councils — typically not day-to-day CMS users)
- الأمانة العامة (General Secretariat)
- قسم العلاقات الخارجية وتثمين نتائج البحث
- قسم متابعة نشاطات البحث في العلوم الإسلامية والحضارة

**Research departments (content scope candidates)**

1. قسم الدراسات القرآنية والفقهية  
2. قسم الفكر والعقيدة والحوار مع الغير  
3. قسم التاريخ الثقافي للجزائر  
4. قسم الحضارة الإسلامية  

**Confirmed scope model (2026-07-19):**

| Role | Default scope |
|------|----------------|
| **Super Admin** | System-wide (users, roles, config, audit, overrides) |
| **Reviewer** | **Centre-wide + all four research departments** |
| **Editor** | **Defined scopes** (selected dept(s) and/or content types) **and/or centre-wide**, assigned at account creation by Super Admin |

Concrete person↔scope mapping for the first 3–5 accounts is an **implementation dependency** (fill at account provisioning). Names are not required in this PRD.

### Personas

| Persona | Role in system | Needs |
|---------|----------------|-------|
| **Editor** | Creates/edits drafts in allowed types and departments | Simple forms, save draft, submit, see comments, revise; edit own profile name/info after account creation |
| **Reviewer** | Approves/rejects within centre-wide + all research depts | Queue, compare versions, approve/publish/unpublish (manual only) |
| **Super Admin** | System owner (very few people) | Create users, assign roles/scopes, workflow config, audit, publish pipeline health |
| **Auditor** (Phase 2+) | Read-only compliance | History and reports only |

**MVP role set:** Super Admin, Editor, Reviewer.  
**Configurable later:** Content Administrator, Publisher, Translator, Auditor — keep data model ready, do not ship separate UX for all in MVP.

**Profile self-service (MVP):** after Super Admin creates the account, the user may edit their **display name and personal info** (not their own role/scopes).

**Four-eyes principle (MVP):** a user who authored an item must not approve/publish that same item, even if they also hold the Reviewer role.

---

## 4. User journeys

### Journey A — Standard news (happy path)

1. Editor signs in → Dashboard shows “My drafts” and “Needs revision.”
2. Editor creates **News**, fills AR fields (required), optionally EN fields, department, label, image + alt text.
3. System validates required fields and editorial checklist prompts.
4. Editor submits → status `submitted`.
5. Reviewer is notified in-app → opens item → reviews → **Approves** and **Publishes** (manual; no schedule).
6. System writes updated public `news.json` (+ media) on the Algeria-hosted publish path.
7. Public SPA shows the item after cache refresh/TTL. Audit log records the chain.

### Journey B — Changes requested

1. Reviewer sets status `changes_requested` with comments (item-level in MVP; field-level later).
2. Editor revises (new revision) and resubmits.
3. Reviewer approves/publishes. Prior revisions remain readable.

### Journey C — Correction to published content

1. Editor opens published item → “Create revision” (public version stays live).
2. Editor edits and submits; Reviewer approves.
3. On publish, new revision becomes the public snapshot; audit records replacement.

### Journey D — Event lifecycle

1. Editor creates event (intl/nat, dates, type, status upcoming/done, optional image).
2. Review → publish updates `events.json`.
3. **Manual only (locked):** Reviewer/Editor sets event display status `upcoming` / `done` (no auto-flip in MVP).

### Journey E — Publication metadata

1. Editor adds title, type (collective/individual), department, description, cover image.
2. Review → publish updates `publications.json` while keeping `covers.length === pubs.length`.
3. Journals list remains out of scope (OJS).

---

## 5. Proposed solution

### Product summary

Build a **secure internal web application** (same institutional host as `crsic.dz`, data in Algeria) where authorized staff manage news, events, and publication metadata through RBAC + editorial workflow. On approval/publish, the app **exports snapshots** compatible with the existing public JSON contract so the current static SPA keeps working.

```text
[Editors/Reviewers]
        │
        ▼
[Internal CMS App] ──DB (Algeria)──► versions, users, audit
        │
        │ publish job
        ▼
[Published JSON + media on crsic.dz]
        │
        ▼
[Public SPA]  ← CONTENT_BASE_URL / local /data
```

### Why this shape

| Option | Decision |
|--------|----------|
| A. Internal app publishes JSON snapshots | **Selected for MVP** — matches existing SPA and `data/CMS.md` |
| B. Public API replacing JSON | Deferred — larger public rewrite |
| C. External SaaS CMS | Rejected — roadmap forbids external CMS as product |
| D. Scripts/docs only | Rejected — does not solve roles/workflow/audit |

### Content status lifecycle (MVP)

| Status | Meaning | Typical actor |
|--------|---------|---------------|
| `draft` | Work in progress | Editor |
| `submitted` | Ready for review | Editor |
| `changes_requested` | Must revise | Reviewer |
| `approved` | Validated, not yet public | Reviewer |
| `published` | In public snapshot | Reviewer (manual publish) |
| `unpublished` | Removed from public snapshot; retained | Reviewer |
| `rejected` | Not approved; retained | Reviewer |

**Out of MVP / Phase 2+:** `scheduled` (auto-publish), `in_review`, `expired`, emergency bypass states.

### Versioning (MVP)

- Each submit/approve/publish path retains a revision with author, timestamp, optional change summary, status transitions.
- Reviewers can view previous revision content (side-by-side **Proposed** for MVP if feasible; at least selectable prior revision).
- Material edit to published content requires new revision + re-approval before replacing the public snapshot.
- Restore prior revision: Super Admin / Reviewer (**Proposed**).

### Permissions (MVP scopes)

Dimensions in MVP:

| Dimension | MVP |
|-----------|-----|
| Role | Super Admin / Editor / Reviewer |
| Content type | news, event, publication |
| Department / org unit | Research depts + centre-wide |
| Language | Create/edit AR and/or EN fields per assignment (**Assumption:** most editors get both; can restrict later) |
| Action | create, edit (own or scoped), submit, review, approve, publish, unpublish, manage users (admin), view audit (admin) |
| Ownership | Editors: own drafts + returned items; Reviewers: all items in scope |

**Not MVP:** geographic/regional scopes, separate Publisher role, self-serve permission granting by Reviewers.

**Governance:** only Super Admin creates users and assigns roles/scopes (avoids permission creep from “reviewers grant roles”).

---

## 6. User stories

### Authentication & accounts

1. As a staff member, I can sign in with my individual account so actions are attributable.  
2. As Super Admin, I can create/deactivate users and assign roles/scopes without deleting historical authorship.  
3. As any user, after my account is created I can edit my display name and personal info (not my role or scopes).  
4. As Super Admin, I can set or reset another user’s password in the admin UI (no email).  
5. As any user, my session expires after **30 minutes** of inactivity.

### Editor

5. As an Editor, I can create news/events/publications only in my allowed scopes.  
6. As an Editor, I can save drafts and submit for review.  
7. As an Editor, I can withdraw a submission that is not yet approved.  
8. As an Editor, I can revise items in `changes_requested` and resubmit.  
9. As an Editor, I can upload allowed images/PDFs with required metadata (alt text for images).  
10. As an Editor, I can publish Arabic while leaving English pending.

### Reviewer

11. As a Reviewer, I can see a queue of submitted items in my scope (centre-wide + all research depts).  
12. As a Reviewer, I can comment, request changes, approve, reject, publish, or unpublish (manual publish only).  
13. As a Reviewer, I cannot approve/publish an item I authored.  
14. As a Reviewer, I can compare or inspect prior revisions before approving a correction.

### Publishing & public site

15. As the system, when an item is published I update the corresponding public JSON snapshot and media paths without breaking the SPA contract.  
16. As a Reviewer, when I unpublish an item it disappears from the public snapshot but remains in the CMS with history.

### Audit

17. As Super Admin, I can view an immutable-ish audit log of auth and content lifecycle events.

---

## 7. Functional requirements

### Must have (MVP)

1. Greenfield authentication (individual accounts, password policy, Super Admin–driven password set/reset — **no email**).  
2. Roles: Super Admin, Editor, Reviewer + scoped assignments.  
3. Content types: **News**, **Events**, **Publications** (metadata + cover).  
4. Status workflow: draft → submitted → changes_requested → approved → published / rejected / unpublished (**no** scheduled auto-publish).  
5. Revision history for content items on the publish path.  
6. **In-app only** notifications for submit, changes requested, approve/reject/publish (**never email**).  
7. Media library: images + PDFs; allowlist MIME/extensions; max size; alt text for images.  
8. Publish pipeline producing `news.json`, `events.json`, `publications.json` (+ stored media URLs/paths) compatible with [data/CMS.md](../../data/CMS.md).  
9. AR/EN fields with independent readiness; AR may publish with EN pending.  
10. Audit log for login (success/fail), user/permission changes, content lifecycle, uploads, publish jobs.  
11. XSS-safe content policy: **plain text only** for public JSON string fields (matches SPA `textContent` / no raw HTML). Richer body may exist internally in DB for later detail pages (P1).  
12. RTL-capable editing UI for Arabic.  
13. Preview of the item payload before publish (public card fields).  
14. Account deactivation + reassignment of open drafts/tasks.  
15. User profile self-edit for name/personal info after account creation (roles/scopes remain Super Admin–only).  
16. Pre-submit **editorial checklist** (MVP): names/titles correct; photo rights/permission; no unintended private phones/IDs.  
17. Session idle timeout: **30 minutes**.
### Should have (MVP if capacity; else early Phase 2)

1. Editorial pre-submit checklist (non-blocking warnings OK).  
2. Basic operational dashboard (counts + queues, not vanity analytics).  
3. “Last updated” metadata stored for future public display.  
4. Backup/restore procedure documented and tested once.

### Nice to have / future

1. Emergency bypass + post-publication review.  
2. Field-level comments, @mentions (in-app only), escalation SLAs.  
3. Virus/malware scanning integration.  
4. Partners, static pages, alerts, galleries as types.  
5. Homepage featured placement permissions.  
6. Translator role and translation linkage rules.  
7. Broken-link / accessibility scanners.  
8. Delegation / out-of-office reviewer backup.  
9. Legal hold & retention policy UI.

**Explicitly never (product policy):** email gateways, email notifications, email-based password reset, or any SMTP dependency.

---

## 8. Acceptance criteria (MVP)

### AC-Auth

- Given valid credentials, user reaches a role-appropriate dashboard.  
- Given deactivated account, login is denied and sessions are invalidated.  
- Passwords are stored hashed; **password set/reset is performed by Super Admin in-app** (no email channel).  
- The product has **no** outbound email integration.

### AC-RBAC

- Editor cannot publish or approve.  
- Reviewer cannot manage global users/roles.  
- Editor cannot see/edit out-of-scope departments/types.  
- Author cannot approve own item (four-eyes).

### AC-News

- Required AR title (+ other mandatory fields defined in §9) enforced before submit.  
- EN may be empty; item can still reach `published` with `en_status = pending`.  
- Published news appears in public `news.json` with contract fields at minimum: `img`, `label`, `title` (extend schema only with explicit public-site change + README update).

### AC-Events / Publications

- Events respect intl/nat split and `status` values expected by SPA (`done` \| `upcoming`) unless public schema is versioned.  
- Publications keep cover↔pub alignment invariant on publish.

### AC-Workflow / versions

- Status transitions are restricted to allowed edges.  
- Publishing a correction does not silently overwrite without a new approved revision.  
- Audit entries exist for submit, approve, publish, unpublish.

### AC-Dev / release

- Day-to-day development runs **locally** (this Windows machine): Cursor Pro + Node app + PostgreSQL **18.4-2**.  
- Merge to `main` / production go-live only when the CMS path works with **zero known bugs / zero friction** on the agreed smoke path (draft → review → publish → public JSON).  
- Until go-live, production `crsic.dz` public site remains the current static SPA; local publish may write to a local `data/` or staging snapshot for verification.

### AC-Success metric plumbing

- System can demonstrate a complete draft → submit → approve → publish path for news, and list items published via CMS (for ops visibility). Numeric quota **N** is not a go/no-go gate.

---

## 9. Content / data impact

### Public JSON contract (MVP publish targets)

| File | CMS ownership | Notes |
|------|---------------|-------|
| `news.json` | Yes | Primary success path |
| `events.json` | Yes | intl/nat |
| `publications.json` | Yes | covers + pubs alignment |
| `journals.json` | No (read-only link out / ignore) | OJS is source of truth |
| `partners.json` | No in MVP | Future |
| `locales/*.json` | No in MVP | UI chrome; not editorial articles |

### Schema evolution

Current public news items are shallow (`img`, `label`, `title`). CMS may store richer internal fields (body, summary, department, author, EN fields, timestamps).

**Decision (2026-07-19): P1** — publish a **compatible subset** to existing SPA fields; keep richer fields internal until public UI is updated.

**Follow-up (tracked in WORKLOG):** dedicated, more detailed public pages for **news** and **publications** (schema + UI enrichment) — not part of CMS MVP ship.

### Multilingual rule (confirmed)

- Arabic can publish with English pending.  
- **Locked (2026-07-20):** Arabic is authoritative when both exist and conflict. EN is not required for MVP publish. While EN is pending, public site keeps current behaviour (Arabic content + notice / language switch) until detail pages ship.### Media

- During local development, store media under the CMS app upload directory; publish into public `img/` (or equivalent) for SPA consumption.  
- Prefer stable URLs on replace so old links do not silently 404.  
- At go-live, media and DB follow Algeria / `crsic.dz` policy.
- **Locked (2026-07-20):** max **5 MB**; allow **JPEG / PNG / WebP + PDF**; public tree **`img/cms/{news|events|covers}/`**; **replace keeps the same public path**.

---

## 10. UX notes

- Internal app is staff-facing; still support AR UI chrome (RTL) and EN UI chrome.  
- Dashboards are **action queues**, not analytic walls: awaiting review, needs revision, recently published.  
- Forms per content type (do not force events into a generic “article” shape).  
- Preview should mirror public card constraints (plain text, image, labels).  
- Accessibility: keyboard usable admin UI; require image alt text before submit when image present.  
- Profile screen: user can update name/info; cannot self-elevate role/scopes.  
- Notifications centre is **in-app only** — no email settings.

---

## 11. Technical considerations

### Constraints (confirmed / roadmap)

- No external CMS product as the system of record.  
- Public site today: zero-dependency static SPA; keep publish contract stable (P1).  
- **No email / SMTP** in any phase of this product as currently scoped.  
- Production residency: Algeria / same host as `crsic.dz` **at go-live**.  
- Greenfield auth.

### Development environment (locked 2026-07-20)

| Item | Choice |
|------|--------|
| Machine | Local Windows developer workstation |
| IDE | Cursor Pro |
| Database | **PostgreSQL 18.4-2** (Windows x64); DB name **`crsic_db`**; app role **`crsic_cms_app`** (rights only on `crsic_db`) |
| App runtime | **Next.js** (App Router) — stakeholder decision 2026-07-20 |
| Git branch | `feature/step4-internal-cms` until zero-friction merge |
| Merge / go-live gate | Fully functional, zero known bugs, smoke path green |

### Suggested architecture (Node + local Postgres)

| Concern | Guidance | Justification |
|---------|----------|----------------|
| Admin app | **Node** (API + staff UI) | Stakeholder preference |
| Data store | **PostgreSQL 18.4-2** local now; same major line on prod at go-live | Residency + stakeholder lock |
| Auth | App sessions + hashed passwords; Super Admin password reset | No email |
| Notifications | In-app persistence only | No email |
| Publish | Atomic JSON snapshots + media for SPA | Fits `CONTENT_BASE_URL` / local `/data` |
| Public site | Unchanged for MVP (P1) | Detail pages deferred |
| Backups | Local dump/restore docs; prod runbook before go-live | Continuity |

**Stack decision:** Node + PostgreSQL 18.4-2. Hosted Supabase rejected. Self-hosted Supabase not required for MVP.

### Integrations

| System | MVP |
|--------|-----|
| Public SPA JSON/media | Required publish integration |
| Local PostgreSQL 18.4-2 | Required data store |
| OJS | Out of scope (link only) |
| OPAC / webmail | Out of scope |
| Email / SMTP | **Forbidden** |
| Ministry SSO | Not available (greenfield) |
| Hosted Supabase | **Not used** |

### Security concerns

- Broken access control (IDOR on content IDs) — test mandatory.  
- XSS — plain text only for public JSON fields.  
- CSRF on state-changing routes.  
- Malicious file upload (extension spoofing, polyglots).  
- Privilege escalation via role assignment — Super Admin only.  
- Audit log tampering — restrict write path; Super Admin read.  
- Session fixation / brute force — rate limit logins.  
- Local vs production secrets never committed.

### Edge cases

- Publish job fails mid-write → keep previous valid public JSON (atomic replace).  
- Concurrent edit → optimistic concurrency with version check.  
- Reviewer absent → Super Admin reassigns (manual).  
- Staff departure → deactivate + reassign; preserve audit names.  
- EN pending forever → reporting flag; no auto-block of AR.  
- Cover/pub length mismatch → publish blocked.  
- Forgotten password → Super Admin resets in UI (no email recovery).  

---

## 12. Risks & dependencies

| Risk | Impact | Mitigation |
|------|--------|------------|
| Scope creep into full ministry CMS | Delay | Enforce MVP type list; Phase 2 backlog |
| Hosted Supabase reintroduced | Compliance | Local Postgres only |
| Local-only habits break prod deploy | Go-live friction | Document env + publish contract from day one |
| No email password recovery | Locked-out users | Super Admin reset SOP |
| Public schema too shallow | Product gap | P1 now; WORKLOG pending detail pages |
| Malware in uploads | Security | Type/size allowlist; quarantine |
| Premature merge to `main` | Regressions | Branch gate: zero known bugs + smoke |

### Dependencies

- PostgreSQL 18.4-2 installed and running locally.  
- Node toolchain on the developer machine.  
- Branch `feature/step4-internal-cms` for all implementation commits.  
- Seed accounts at first usable build: ≥1 Super Admin, ≥1 Reviewer, Editors with scopes.  
- Go-live host access only when local product is complete (not a day-one blocker).

---

## 13. Success metrics

| Metric | Target | Window |
|--------|--------|--------|
| End-to-end CMS publish works locally (draft → review → public JSON) | Pass | Before merge |
| Zero known bugs / zero friction on smoke path | Pass | Merge + go-live gate |
| CMS-published items need no hand JSON edits | 100% of CMS publishes | Ongoing |
| Four-eyes violations | 0 (system-enforced) | Ongoing |
| Email/SMTP dependencies in codebase | 0 | Ongoing |

**Primary bar:** it works cleanly. No volume quota.

---

## 14. MVP scope vs phases

### Phase 0 — Foundations (local)

- Confirm Postgres 18.4-2 + Node on this machine.  
- Scaffold Node app + schema (users, roles, content, audit, notifications).  
- Auth (login, session, Super Admin password set/reset).  
- Seed org units (4 research depts + centre-wide).  
- Record chosen Node framework in Decision log **only after stakeholder prompt/decision**.

### Phase 1 — MVP (local complete → then merge)

- News + Events + Publications workflows (manual publish).  
- Media upload + in-app notifications.  
- Publish pipeline to local public JSON contract (P1).  
- Dashboards + profile self-edit.  
- Runbook: backup/restore, Super Admin password reset, offboarding.  
- Smoke: zero known bugs → merge `feature/step4-internal-cms` → `main`.

### Phase 2 — Governance hardening (still no email)

- Emergency bypass + post-publication review.  
- Scheduled publish (if later needed).  
- In-app escalation / delegation.  
- Optional malware scanning.  
- Richer comments.

### Phase 3 — Content surface + go-live prep

- Detailed public news/publication pages (WORKLOG pending).  
- Partners/static pages/alerts as needed.  
- Production deploy to Algeria / `crsic.dz` when local product is frictionless.

---

## 15. Open questions

1. ~~Exact **N**~~ → **Closed:** no numeric quota.  
2. ~~Public schema P1 vs P2~~ → **Closed: P1**; detail pages pending.  
3. ~~Scheduled publish~~ → **Closed:** manual only.  
4. ~~Role/scope pattern~~ → **Closed** (see §3).  
5. ~~Stack~~ → **Closed:** Node + PostgreSQL 18.4-2 local; Cursor Pro; feature branch workflow.  
6. ~~Email~~ → **Closed:** no email features.  
7. ~~Password reset~~ → **Closed:** Super Admin in-app reset.  
8. ~~Session timeout~~ → **Closed: 30 minutes** (2026-07-20).  
9. ~~Public card formatting~~ → **Closed: plain text only** for public JSON (2026-07-20).  
10. ~~Event end → `done`~~ → **Closed: manual only** — Reviewer/Editor sets `upcoming` / `done` (2026-07-20).  
11. ~~Arabic vs EN conflict~~ → **Closed (2026-07-20):** Arabic authoritative when both exist and conflict; EN not required for MVP publish; EN pending keeps current public AR + notice/switch behaviour until detail pages.  
12. Exact named people for first accounts — prompt at first seed.  
13. ~~Privacy SOP~~ → **Closed for MVP (2026-07-20):** editorial checklist only (names/titles correct; photo rights; no unintended phones/IDs; Super Admin can unpublish). No separate legal module.  
14. ~~Exact Node framework~~ → **Closed: Next.js (App Router)** (2026-07-20).  
15. ~~Database name~~ → **Closed: `crsic_db`** (broader than CMS-only; future features) (2026-07-20).  
16. ~~DB app role~~ → **Closed: `crsic_cms_app`** with rights only on `crsic_db` (2026-07-20).

**Process:** any new ambiguity discovered during implementation → prompt → Decision log → then code.
---

## 16. Assumptions log

| ID | Assumption | Impact if wrong |
|----|------------|-----------------|
| A1 | 3–5 users remain accurate for 6 months | UX scaling |
| A2 | Research depts + centre-wide are right scopes | Rework assignments |
| A3 | Local Postgres 18.x maps cleanly to prod host later | Deploy friction |
| A4 | P1 subset acceptable until detail pages | Shallow public cards |
| A5 | Super Admin password reset without email is acceptable | Locked-out UX if rejected |
| A6 | Plain text public JSON is correct for P1 SPA | Earlier rich text if rejected |
| A7 | Partners/locales/static pages can wait | Earlier expansion |
| A8 | Volume quota unnecessary | Later KPI ask |
| A9 | Merge only from `feature/step4-internal-cms` when smoke is clean | Process drift |
| A10 | **Ambiguities are resolved only by prompting the stakeholder — never assume, never silent default** | Wrong builds if ignored |
| A11 | DB name `crsic_db` is intentionally broader than CMS for future features | Rename later if wrong |
---

## 17. Future improvements

- Detailed public news / publication pages (WORKLOG pending).  
- Scheduled publish.  
- Emergency notices workflow.  
- Configurable multi-step approvals by content type.  
- Translator role and AR/EN linkage rules.  
- Field-level review comments (in-app).  
- Homepage / featured placement permissions.  
- Document expiry and periodic review reminders.  
- Deeper accessibility linting before submit.  
- Read-only Auditor role and exportable compliance packs.  
- Optional migration of selected static pages into CMS.

**Out of product policy:** email-based features.

---

## 18. Decision log

| Date | Decision |
|------|----------|
| 2026-07-19 | Proceed with internal app (not external CMS), JSON snapshot publish to existing public contract |
| 2026-07-19 | MVP content types: news, events, publications only |
| 2026-07-19 | Journals remain OJS-owned |
| 2026-07-19 | AR may publish with EN pending |
| 2026-07-19 | Production residency: Algeria / same host as crsic.dz (at go-live) |
| 2026-07-19 | Auth: greenfield individual accounts |
| 2026-07-19 | Emergency bypass deferred to Phase 2 |
| 2026-07-19 | MVP roles: Super Admin, Editor, Reviewer; Super Admin owns user provisioning |
| 2026-07-19 | Success = end-to-end path works; no minimum news volume **N** |
| 2026-07-19 | Public schema **P1**; detailed news/publication pages deferred (WORKLOG) |
| 2026-07-19 | Manual publish only; no scheduled auto-publish in MVP |
| 2026-07-19 | Reviewer scope = centre-wide + all research depts; Editors get defined scopes and/or centre-wide |
| 2026-07-19 | Users may edit name/personal info after account creation |
| 2026-07-19 | Hosted Supabase **rejected** for production CMS data |
| 2026-07-20 | **No email features** — Super Admin password reset in-app; in-app notifications only |
| 2026-07-20 | Dev stack: local Windows + **Cursor Pro** + **PostgreSQL 18.4-2** + Node |
| 2026-07-20 | Implementation branch: `feature/step4-internal-cms`; merge/`main`/go-live only when zero friction |
| 2026-07-20 | **Ambiguity policy:** always prompt stakeholder; never assume; never silent default |
| 2026-07-20 | Node framework: **Next.js (App Router)** |
| 2026-07-20 | Database name: **`crsic_db`**; app role: **`crsic_cms_app`** (rights only on that DB) |
| 2026-07-20 | Session timeout: **30 minutes** |
| 2026-07-20 | AR authoritative on conflict; EN optional for MVP; EN pending = current public behaviour |
| 2026-07-20 | Public JSON fields: **plain text only** |
| 2026-07-20 | Event status `upcoming`/`done`: **manual** (Reviewer/Editor) |
| 2026-07-20 | Personal data MVP: editorial checklist + Super Admin unpublish; no legal module |
| 2026-07-20 | App directory: **`cms/`** at repo root |
| 2026-07-20 | First Super Admin: **F. Chettih** / `f.chettih@crsic.dz` (login = email; no SMTP) |
| 2026-07-20 | Media: **5 MB** max; **images + PDF**; public path **`img/cms/{news|events|covers}/`**; **stable path on replace** |
| TBD | Exact named people for Editor/Reviewer seed accounts |
---

## 19. Mapping to template sections

This PRD expands [TEMPLATE.md](./TEMPLATE.md). Status remains **Review** until marked **Approved**; implementation proceeds on `feature/step4-internal-cms` against locked decisions. Keep [docs/prds/README.md](./README.md), [docs/WORKLOG.md](../WORKLOG.md), and root [README.md](../../README.md) §10 in sync.
