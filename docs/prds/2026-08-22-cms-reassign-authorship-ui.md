# PRD: CMS UI — align authorship to desks + assignable publisher

| Field | Value |
|-------|--------|
| Status | **Delivered** (2026-08-22) |
| Date | 2026-08-22 |
| Author | Stakeholder + agent |
| Owners | Product / CMS + public news/event bylines |
| Related roadmap step | Deferred backlog #1 — CMS UI to reassign editor / reviewer / publisher |
| Related | [2026-08-21-spa-news-event-card-byline.md](./2026-08-21-spa-news-event-card-byline.md) (public bylines; this slice **replaces** the hardcoded publisher name); ops `cms/scripts/reassign-to-editor-claims.ts` |
| Supersedes | Byline PRD must-have §4.7 (“publisher always فريحة بوفاتح / Fariha Boufatah”) **once this PRD is implemented** |

## 1. Problem

Desk claims (who owns news, publications, a research org, …) can change in User management. Authorship on `content_items` does not follow automatically. Today that catch-up is a **terminal script** (`npm run db:reassign:to-claims`): no preview in the Desk, no notify, no public JSON rebuild. Live news/event cards can keep stale **editor** names after a desk change.

Public **publisher** is still hardcoded to Boufatah on every news/event card. The centre wants that line to be a **real Reviewer** who is scoped to the item’s organisation — with Boufatah as fallback.

Who feels it: Super Admin and Reviewer (cannot safely realign without ops); Editors (silent ownership moves); visitors (wrong or frozen bylines).

## 2. Goals

- Super Admin and Reviewer can **preview then Apply** “align to desks” from the CMS Desk, without the terminal.
- After Apply, **published** news/event **bylines** on the public site match CMS people (editor, reviewer, publisher).
- Editors who **receive** items are told in CMS notifications. If a **Reviewer** ran Apply, every **active Super Admin** is told.
- Publisher on news/event cards is an **assignable Reviewer** (scoped to that org). Empty or inactive → Boufatah, as today.
- Cover files (`bucket = covers`) follow the publications Editor when that desk is in the actor’s scope.

**Non-goals**

- Pagination, recycle bin, scheduled publish, bulk clone / import-export, media crop, EN editorial body parity, static pages in CMS, journals in CMS (deferred #2–#9).
- Email / SMTP (product has none). Notifications stay **in-CMS**.
- Changing **who may click Publish** (still Reviewer or Super Admin, four-eyes). The public “publisher” **name** is not “last person who clicked Publish”.
- A second per-item **editor** picker or a replacement for **Review owner** (those already exist). This slice **keeps** them.
- Assigning Super Admin as public publisher (picker is **Reviewer role** only).
- Bylines on publications, partners, laws, platforms, research, journals, or alerts.
- Rewriting User management (accounts stay on `/dashboard/users`).

## 3. Users & roles

| Role | Needs |
|------|--------|
| Super Admin | Run Align for **all** orgs; set per-item publisher on news/events; see claim map, dry-run, and **rebuild status** without opening logs |
| Reviewer | Run Align **only for items in their exclusive org claims (R1)**; set publisher on news/events they can already edit |
| Editor | Cannot run Align or change publisher. Receives a notification when items move onto their desk |
| Public visitor | News/event cards still show التحرير / المراجعة / النشر; publisher name may now be the scoped Reviewer, else Boufatah |
| Ops | Keep `db:reassign:to-claims` as emergency CLI (no notify, no JSON rebuild) |

## 4. Requirements

### Must have

1. **Desks page** (SA + Reviewer only): **one** admin screen at `/dashboard/editors` (nav label **Desks** / **المكاتب**). Combines today’s Editors (who claims which type) with Align (dry-run + Apply). `/dashboard/authorship` redirects here. **Users** stays a separate Super Admin page (accounts, passwords, delete).
2. **Two actions, one page — not one form.**
   - **Save desks** writes the org chart only. It does not move items.
   - The dry-run **below** updates on the same page after save (no second menu).
   - **Apply** moves editors / review owners / covers and rebuilds live news/event bylines.
   - If desk checkboxes are **unsaved**, Apply is disabled (“Save desk changes first”). Apply always uses the last **saved** chart.
   - Read-only editor claim list is omitted here (the Editors block *is* the map). Show exclusive **Reviewer** claims as context.
3. **Apply (R1):**
   - Super Admin: all items with a matching editor claim.
   - Reviewer: only items whose `org_unit_id` is in **that Reviewer’s** `reviewer_org_claims`. Covers move only if the publications desk is in that same scope.
5. **Editor (`created_by`):** same rules as `reassign-to-editor-claims.ts` (`editorFor`: centre-wide types vs research group/project + org).
6. **Review owner:** set to the exclusive Reviewer for the item’s org (`reviewer_org_claims`). If none, leave `review_owner_id` unchanged.
7. **Publisher (P3):**
   - New nullable `content_items.publisher_id` (FK `users`).
   - **Bulk:** set `publisher_id` to that org’s Reviewer **only when** it is null, or the current user is inactive / not a Reviewer / not scoped to that org. **Do not wipe** a valid per-item pick.
   - **Per-item:** on **news and event** edit pages only (SA + Reviewer), a publisher dropdown: active users with **role = reviewer** whose exclusive org claim includes this item’s org. Saving a published item **rebuilds** that type’s public JSON in the same request.
8. **Fallback (F1):** when building public JSON, if `publisher_id` is null or the user cannot be used (missing, inactive), write **فريحة بوفاتح** / **Fariha Boufatah** (`PUBLIC_PUBLISHER_*` constants). Never a blank publisher line on news/event cards.
9. **Covers:** move `media_assets` with `bucket = covers` to the publications Editor, same as the script, when that claim is in scope (must #4).
10. **JSON rebuild in the same Apply:** after a successful DB commit, rebuild **`data/news.json` and `data/events.json`** if any **published** news/event in scope changed editor, review owner, or publisher. Use existing `.bak` behaviour. Other public JSON files unchanged. Draft / in-review items do not need a public rebuild.
11. **Notify (in-CMS only):**
    - One notification **per Editor who received at least one item** (count + types in the body; not one row per item).
    - If the actor is a Reviewer: one notification to **each active Super Admin** (who ran it, counts). Super Admin running Apply does not notify other SAs.
    - Do not notify for no-op Align (zero moves and zero cover moves).
12. **Audit:** per-item `content.reassign` (or equivalent) plus one bulk summary action; actor is the **logged-in user** (not the first SA in the database, unlike the CLI script). Include from/to, review owner, publisher, cover count.
13. **Idempotent:** a second Apply with no desk changes shows zero moves and does not spam notifications.
14. **Existing UI stays:** per-item **Reassign author** and **Review owner** panels unchanged in this slice.
15. **Rebuild status badge** on the Desks page (visible to SA and Reviewer; built so Super Admins need not inspect logs):
    - **Never:** no successful Align rebuild yet.
    - **OK:** last **successful** Align rebuild — timestamp, who ran it, and **item counts** written to public JSON that run (news N + events M, or “no public rebuild needed” if no published news/event in the Apply set).
    - **Stale / failed:** authorship Apply committed but JSON rebuild failed — keep showing the last success if any, plus a clear failed state and retry. Do not require audit-log diving.

### Should have

1. Dry-run table can be long; show grouped **counts first**, with a truncated sample of titles and a “N more” hint (no new pagination product).
2. AR/EN CMS strings in `labels.ts` (keys in sync).
3. Unit tests: R1 scope; publisher eligible list; F1 fallback; bulk does not overwrite a valid `publisher_id`; JSON publisher field uses assigned Reviewer names.
4. CMS-OPS / smoke: Align dry-run + Apply; Reviewer cannot move another org’s items; per-item publisher on a published news item updates the public card; Align badge updates after a successful rebuild.

### Nice to have

1. Link from the Align success state to Notifications / Audit.
2. After implementation, a one-line note on the old byline PRD that publisher is no longer hardcoded.

## 5. Content / data impact

| Surface | Change |
|---------|--------|
| `data/news.json` / `data/events.json` | Same byline **keys**. `publisher_ar` / `publisher_en` come from `publisher_id` names, else Boufatah. Schema unchanged. |
| Other `data/*.json` | No change in this slice. |
| `data/locales` | No new public keys (labels already shipped). |
| CMS DB | `publisher_id` on `content_items` + index. |
| Public SPA | No layout change; it already renders the JSON names. |

## 6. UX notes

- Visual language: Desk interiors (I2) — one page, two numbered cards. Badge + **Save desks** then **Apply**. Destructive-looking **Apply** only after a dry-run of the **saved** chart.
- Nav: **Desks** (`/dashboard/editors`) for SA + Reviewer. `/dashboard/authorship` redirects there. Users stays under Administration for Super Admin.
- Copy: this does **not** publish or unpublish. It only moves ownership and refreshes **already live** news/event bylines.
- Publisher picker sits with the existing people chrome on news/event edit (near Review owner), not on other types.
- Editors never see the Desks Align controls (nav is SA + Reviewer only).
- Empty eligible-publisher list: show fallback copy (“Public card will show Boufatah until a scoped Reviewer is assigned”).

## 7. Technical notes

- Wrap shared align logic so Desk API and the CLI script do not drift; CLI may stay notify-less and rebuild-less.
- Publish pipeline (`newsJson` / `eventsJson`): stop forcing `PUBLIC_PUBLISHER_*` when a usable `publisher_id` exists; keep constants for F1.
- Rebuild failure after DB commit: **keep** the authorship writes; show a clear error that public bylines may be stale and offer retry rebuild. Do not silently roll back desks. Persist last Align rebuild outcome (time, actor, news count, event count, ok/fail) so the badge is one query — not log scraping. Per-item publisher save that rebuilds JSON does **not** overwrite this Align badge (it is Align-specific).
- Next.js 16 App Router (`cms/`); read installed `cms/node_modules/next/dist/docs/` before coding.
- Staff desks remain provisional: Align is safe to re-run after they re-check claims.

## 8. Success metrics

- SA can dry-run and Apply without SSH/terminal; Reviewer Apply cannot change another org’s items.
- After Apply, a published news card’s editor/reviewer/publisher match CMS (or F1 for publisher).
- Changing publisher on one published event updates that card without a full desk Align.
- Receiving Editor and (when Reviewer applied) Super Admin see in-CMS notifications. Desks page shows last rebuild status without opening Audit.
- `cms` tests + SPA tests still pass; smoke A–D plus new Align / publisher checks.

## 9. Open questions

None — product lock 2026-08-22. Implementation questions stay in the decision log if they appear during build.

## 10. Decision log

| Date | Decision |
|------|----------|
| 2026-08-22 | Hybrid **A + C**, plus **narrow B for publisher only**. Not a second editor/reviewer picker set. |
| 2026-08-22 | Who: Super Admin **and** Reviewer. Reviewer Apply → notify **all active Super Admins**. |
| 2026-08-22 | Always dry-run, then Apply. |
| 2026-08-22 | Rebuild **news + events** JSON in the same Apply (published items). |
| 2026-08-22 | Notify new Editors (one notification per Editor, with counts). In-CMS only. |
| 2026-08-22 | Covers follow the publications Editor (in actor scope). |
| 2026-08-22 | **R1:** Reviewer Align is limited to their exclusive org claims. |
| 2026-08-22 | **P3:** Bulk default publisher = org Reviewer; **plus** per-item picker on news/event edit. |
| 2026-08-22 | **F1:** Missing/unusable publisher → Boufatah on the public card. |
| 2026-08-22 | Bulk **does not overwrite** a valid manual `publisher_id` (otherwise P3 is pointless). |
| 2026-08-22 | Public publisher name ≠ last Publish click. Four-eyes publish rights unchanged. |
| 2026-08-22 | Improvement: claim map on the Align page; grouped counts before a long row list. |
| 2026-08-22 | Align page **rebuild status badge**: last successful Align JSON rebuild + item counts; failed/stale distinct from never. |
| 2026-08-22 | **Approved.** |
| 2026-08-22 | Implemented on `feature/cms-align-authorship`. Public publisher is no longer hardcoded when `publisher_id` is a usable Reviewer (F1 still Boufatah). |
| 2026-08-22 | **One Desks page:** Editors claims + Align dry-run/Apply on `/dashboard/editors`. Users stays separate. Unsaved desks disable Apply. |
| 2026-08-22 | **Delivered** on `main` (`feature/cms-align-authorship`). |
