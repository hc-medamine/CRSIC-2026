# CMS legacy JSON cutover policy

How the CRSIC internal CMS takes over the public `data/*.json` files without losing the
existing (legacy) static cards.

Related: [CMS-OPS.md](./CMS-OPS.md), [cms/README.md](../../cms/README.md), PRD Phase 1.

---

## 1. How publish drives the public JSON

Since migration `010_live_payload.sql`, the public JSON is rebuilt from every `content_items`
row **where `live_payload IS NOT NULL`** — not only rows with `status = 'published'`.

| Action | Effect on `live_payload` | Effect on public JSON |
|--------|--------------------------|-----------------------|
| Publish | Set to the P1 public object; `status = 'published'` | Row appears |
| Unpublish | Cleared (`NULL`); `status = 'unpublished'` | Row removed |
| Create revision (public stays live) | **Kept**; `status = 'draft'` | Row **stays** until next publish replaces it |

This is what lets an editor correct a published item (draft → submit → four-eyes approve →
publish) while the public site keeps serving the last published copy the whole time.

## 2. The cutover problem

The **first** CMS publish rebuilds the whole file from CMS rows only. Any legacy card that was
never imported into the CMS would disappear from the public site on that first publish.

**Policy — pick one before production cutover:**

1. **Import legacy first (recommended, no loss):** run `npm run db:import-legacy` so the current
   `data/news.json`, `data/events.json`, `data/publications.json` become CMS rows that are
   `published` with `live_payload` set. Future publishes then emit legacy **plus** new items.
2. **Accept loss:** knowingly cut over with only CMS-authored items, dropping non-imported legacy
   cards. Only acceptable if the legacy content is being retired.

## 3. `npm run db:import-legacy`

```powershell
cd cms
npm run db:import-legacy
```

What it does:

- Reads the current `data/news.json`, `events.json`, `publications.json`.
- Inserts each item into `content_items` as **`published`** with `live_payload` set to the P1
  public object (and `live_at = NOW()`).
- `org_unit` = **centre-wide** (looked up from `org_units`); `created_by` = Super Admin
  **`f.chettih@crsic.dz`** (must be seeded first via `npm run db:seed:super-admin`).
- Publications keep the invariant: imports `pubs[i]` together with `covers[i]`, so
  `covers.length === pubs.length`.
- **Idempotent-ish:** skips any item whose `title_ar` already exists as a `published` row of the
  same content type, so re-running does not duplicate.
- **Does NOT rewrite** `data/*.json` — the payloads already match the source files; the script
  only populates the database. The files are next rewritten by a normal CMS publish/unpublish.

## 4. Recommended cutover sequence

1. Back up DB + media + JSON (see [CMS-OPS.md](./CMS-OPS.md) §1 and §8).
2. `npm run db:seed:super-admin` (ensure `f.chettih@crsic.dz` exists).
3. `npm run db:import-legacy`.
4. Verify counts in `/dashboard` queues and `/dashboard/{news|events|publications}`.
5. Author/publish a new item — confirm the rebuilt JSON now contains legacy **and** new items,
   and that publications still satisfy `covers.length === pubs.length`.
6. If anything looks wrong, restore `data/*.json` from `.bak` (see CMS-OPS §2) and re-plan.
