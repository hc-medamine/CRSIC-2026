# Design: Media DELETE (CMS)

| Field | Value |
|-------|--------|
| Status | **Approved** |
| Date | 2026-07-26 |
| Author | Architecture follow-up (feature completeness audit) |
| Related | Audit gap: no media delete; PR [#16](https://github.com/hc-medamine/CRSIC-2026/pull/16) (separate bugfixes) |
| Impl gate | Approved 2026-07-26 — D1–D5 = A (on-demand, revisions block, hard delete, ignore previews, no force-delete) |

---

## 1. Problem

Editors can upload and replace media (`media_assets` + dual files under `cms/uploads/` and `img/cms/`), but cannot delete anything. Disk and DB grow without bound. A naive delete would break published pages, draft attachments, SEO `og_image`, and revision restore.

## 2. Goals

1. Delete an unused CMS media asset (DB row + both file copies) safely.
2. Block delete when any **durable** content still references the asset’s `public_path`.
3. Show the operator *why* delete is blocked (list of referencing content items).
4. Keep auth aligned with existing media ACL (`canManageMediaAsset` / bucket access).

### Non-goals (this slice)

- Crop / optimize / CDN variants
- New media buckets (partners/alerts/research) — product decision, separate
- Deleting legacy static files under `img/covers/`, `img/Holders/`, logos (not `media_assets` rows)
- Bulk delete / recycle-bin UI
- Scanning `body_ar` / `body_en` (sanitize allowlist has no `<img>` today)

---

## 3. Reference inventory (scanner inputs)

Identity of an asset for reference matching is always:

```text
media_assets.public_path  →  e.g. img/cms/news/<uuidnodash>.jpg
```

Replace-in-place keeps the same `public_path`, so scanning by path (not by “current draft only”) is mandatory.

### 3.1 Durable references (must block delete)

| # | Location | How to match `public_path` |
|---|----------|----------------------------|
| 1 | `content_items.image_path` | equality |
| 2 | `content_items.og_image` | equality |
| 3 | `content_items.attachments` JSONB | `EXISTS (SELECT 1 FROM jsonb_array_elements(attachments) e WHERE e->>'src' = $path)` |
| 4 | `content_items.live_payload` JSONB | see §3.2 (public stays live during revision) |
| 5 | `content_revisions.snapshot` JSONB | `snapshot->>'image_path'`, `snapshot->>'og_image'`, `attachments[].src` |

### 3.2 `live_payload` path shapes (by content type)

| Type | Paths inside `live_payload` |
|------|-----------------------------|
| news / event | `.img`, `.media[].src`, `.og_image` |
| publication | `.cover`, `.media[].src`, `.og_image` |
| partner / alert / research_group / research_project | `.og_image` only |

`data/*.json` is rebuilt from `live_payload` — **do not** treat on-disk JSON as a separate source of truth for the scanner. If `live_payload` is clear, the next rebuild drops the public path.

### 3.3 Ephemeral references (proposed: do not block)

| Location | Why |
|----------|-----|
| `preview_tokens.payload` | TTL 30 minutes; blocking forever is wrong; race window is short |

**Recommendation:** ignore preview tokens for delete blocking. Optional later: if an unexpired preview token contains the path, return 409 with `retryAfter` until expiry (nice-to-have, not v1).

### 3.4 Out of scope paths

- Any `og_image` / attachment `src` that is **not** `img/cms/...` (legacy or external) — DELETE API only applies to `media_assets` rows; those paths are never deleted by this feature.
- Files under `img/` that have no `media_assets` row.

### 3.5 Scanner API (lib)

```ts
type MediaReference = {
  contentItemId: string;
  contentType: string;
  titleAr: string;
  status: string;
  source: "image_path" | "og_image" | "attachments" | "live_payload" | "revision";
  revisionId?: string;
  revisionNumber?: number;
  dashboardPath: string; // /dashboard/{segment}/{id}
};

function listMediaReferences(publicPath: string): Promise<MediaReference[]>;
function isMediaReferenced(publicPath: string): Promise<boolean>;
```

Implementation: one SQL query (or a small union of queries) parameterized by `public_path`. Deduplicate by `(contentItemId, source, revisionId?)` for the UI list.

---

## 4. Refcount strategy

| Option | Pros | Cons |
|--------|------|------|
| **A. On-demand scan (recommended)** | Always correct; no migration; no drift when content saves forget to bump counters | Slightly heavier DELETE (acceptable at current scale; media library already caps list ~100) |
| B. Maintained `ref_count` column | Fast DELETE | Easy to desync (every content save, publish, restore, unpublish, revision write must update); high bug risk |

**Decision proposal: A — on-demand scan.** Revisit B only if DELETE latency or lock contention becomes measurable (unlikely before thousands of content rows × revisions).

---

## 5. Do revision-held references block delete?

| Option | Meaning |
|--------|---------|
| **A. Yes — revisions block (recommended)** | If any revision snapshot still points at the path, DELETE → 409. Restore remains safe. |
| B. No — only current row + live_payload | Editors can delete “unused” files that old revisions still need; restore silently breaks media |
| C. Soft policy — block live/draft, warn on revisions only | Complex UI; still unsafe if operator confirms |

**Decision proposal: A.** History in this CMS is a first-class restore feature; destroying files referenced only by snapshots recreates the research JSONB class of bug (working feature destroys data).

**Implication:** to free an asset, editors must either (1) never have used it in a saved revision, or (2) accept that old revisions keep it alive until those content items (and their revision history) are deleted by SA — we do **not** propose rewriting revision snapshots in v1.

---

## 6. Hard delete vs soft-delete + cron

| Option | Behavior |
|--------|----------|
| **A. Hard delete when unblocked (recommended)** | Transaction: verify zero refs → delete both files → delete `media_assets` row → audit log. No `deleted_at`. |
| B. Soft-delete + orphan-sweep cron | Set `deleted_at`, hide from library, cron removes files after N days | Needs cron/hosting, more states, recovery UX |

**Decision proposal: A.** Volume is small; dual files are local; soft-delete adds ops surface without product need. Orphan *detection* can remain a future ops script; it is not required for correct DELETE.

**Filesystem (both must go):**

1. `{repo}/img/cms/{bucket}/{uuid}.{ext}` ← `public_path`
2. `cms/uploads/{media_id}.{extension}` ← staging twin

If a file is already missing, treat as success for that path (idempotent cleanup) and still remove the DB row when unblocked.

---

## 7. API shape

### `DELETE /api/media/[id]`

**Auth:** session required; `canManageMediaAsset(user, asset)` (same as replace). Reviewers/SA: centre-wide; editors: own uploads only.

**Happy path — 200**

```json
{ "ok": true, "id": "<uuid>", "publicPath": "img/cms/news/...." }
```

**Blocked — 409 Conflict**

```json
{
  "ok": false,
  "error": "Media is still referenced",
  "code": "MEDIA_IN_USE",
  "publicPath": "img/cms/news/....",
  "references": [
    {
      "contentItemId": "...",
      "contentType": "news",
      "titleAr": "...",
      "status": "published",
      "source": "live_payload",
      "dashboardPath": "/dashboard/news/..."
    },
    {
      "contentItemId": "...",
      "contentType": "news",
      "titleAr": "...",
      "status": "draft",
      "source": "revision",
      "revisionId": "...",
      "revisionNumber": 3,
      "dashboardPath": "/dashboard/news/..."
    }
  ]
}
```

**Other:**

| Status | When |
|--------|------|
| 401 | No / expired session |
| 403 | Cannot manage asset |
| 404 | Unknown id |

**Audit:** `media.delete` with `publicPath`, `bucket`, actor.

**Concurrency:** re-check references immediately before delete inside the same request (TOCTOU: accept rare race; no distributed lock required at this scale). Prefer: `BEGIN` → select asset → scan refs → delete row → `COMMIT` → then unlink files (or unlink inside txn after row delete). If unlink fails after row delete, log loudly; row is already gone so library won’t re-offer the broken asset — ops can remove stray files.

Recommended order:

1. Load asset + ACL  
2. Scan refs → 409 if any  
3. Delete DB row  
4. Unlink staging + public files  
5. Audit  

---

## 8. UI

**File:** `cms/src/app/dashboard/media/media-library-client.tsx`

1. **Delete** control on each asset (next to / instead of only “Select to replace”), visible when `canManage` (client already knows library membership; server enforces).
2. Confirm dialog for unblocked delete: filename + path + “This cannot be undone.”
3. **Blocked dialog** when API returns 409:
   - Title: “Cannot delete — still in use”
   - List references: title, type, status, source label (`Current field` / `Live public copy` / `Revision #N`)
   - Link each row to `dashboardPath`
   - No force-delete button in v1

Optional (should-have): disable Delete with tooltip after a cheap HEAD/prefetch of refs — not required; POST/DELETE + dialog is enough.

---

## 9. Auth & roles (unchanged policy)

| Role | Delete |
|------|--------|
| Super Admin / Reviewer (centre-wide viewer) | Any asset in library |
| Editor | Only assets they uploaded, in buckets they can access |
| Others | 403 |

No new role. No “force delete” for SA in v1 (avoids silent public breakage); SA uses the same 409 list and must clear refs via content workflow / content delete.

---

## 10. Tests (when implementing)

1. Upload asset → DELETE → 200; row gone; both files gone.  
2. Attach to news `attachments` / `image_path` → DELETE → 409 with `source: attachments` or `image_path`.  
3. Publish (path in `live_payload`) → clear draft fields but keep live → DELETE → 409 `live_payload`.  
4. Create revision snapshot containing path → clear current fields + unpublish (null live) → DELETE → 409 `revision`.  
5. Editor cannot delete another editor’s upload → 403.  
6. Legacy path string not in `media_assets` → N/A (no id).

---

## 11. Implementation sketch (post-approval only)

| Piece | Path |
|-------|------|
| Scanner | `cms/src/lib/media/references.ts` (new) |
| Delete | `deleteMediaAsset(user, id)` in `store.ts` |
| Route | `DELETE` in `cms/src/app/api/media/[id]/route.ts` |
| UI | `media-library-client.tsx` + small confirm/blocked dialog component |
| Tests | `cms/src/lib/media/media.delete.test.ts` |
| Docs | Note in `docs/qa/SMOKE-CMS.md` after ship |

No SQL migration required for option A (hard delete, on-demand scan).

**Effort:** M (~1–2 days)  
**Dependencies:** none from product parity decisions (buckets / preview / SPA detail)

---

## 12. Decision sign-off

Check one per row, then set Status → **Approved**.

| # | Topic | Options | Proposed | Approved choice |
|---|-------|---------|----------|-----------------|
| D1 | Refcount | A on-demand / B maintained column | **A** | ☑ A  ☐ B |
| D2 | Revision refs block delete? | A yes / B no / C warn-only | **A** | ☑ A  ☐ B  ☐ C |
| D3 | Delete style | A hard / B soft + cron | **A** | ☑ A  ☐ B |
| D4 | Preview tokens | A ignore / B block while unexpired | **A** | ☑ A  ☐ B |
| D5 | SA force-delete | A none in v1 / B SA override | **A** | ☑ A  ☐ B |

**Approver:** Stakeholder (chat)  
**Date:** 2026-07-26  


### Open notes for approver

- D2=A means some uploads may be undeletable for a long time if they appeared in any revision. That is intentional safety. Content hard-delete (SA, unpublished/rejected only) cascades revisions and would free those refs.
- If you prefer “editors can clean the library aggressively,” choose D2=B and accept broken restore thumbnails/PDFs — **not recommended**.

---

## 13. Approval → next step

When Status is **Approved** (all D1–D5 checked):

> Implement media DELETE per `docs/designs/2026-07-26-media-delete.md` (approved decisions D1–D5). Do not invent force-delete or soft-delete unless approved.
