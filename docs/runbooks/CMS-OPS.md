# CMS operations runbook

Local / pre-go-live operations for the CRSIC internal CMS (`cms/` + PostgreSQL `crsic_db`).  
Production Algeria / `crsic.dz` steps will extend this document at go-live.

Related: [SMOKE-CMS.md](../qa/SMOKE-CMS.md), [cms/README.md](../../cms/README.md), PRD Phase 1.

---

## 1. Backup

### Database (`crsic_db`)

From a machine with `pg_dump` and network access to Postgres:

```powershell
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$out = "C:\backups\crsic_db-$stamp.dump"
# Adjust host/user; password via PGPASSWORD or .pgpass
pg_dump -h localhost -U crsic_cms_app -d crsic_db -Fc -f $out
```

Store dumps off the app disk (encrypted share / institutional backup). Keep at least the last **7** successful dumps during active development.

### Media

CMS writes:

| Location | Role |
|----------|------|
| `cms/uploads/` | Staging copy (gitignored) |
| `img/cms/news\|events\|covers/` | Public paths used by the SPA (gitignored binaries) |

Backup both trees together with the DB dump (same timestamp):

```powershell
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
Compress-Archive -Path "cms\uploads","img\cms" -DestinationPath "C:\backups\crsic-media-$stamp.zip"
```

### Public JSON

Publish also writes `data/*.json.bak` beside each file. For a deliberate cutover backup:

```powershell
Copy-Item data\news.json,data\events.json,data\publications.json C:\backups\json-$stamp\
```

---

## 2. Restore

### Database

```powershell
# WARNING: overwrites crsic_db
pg_restore -h localhost -U crsic_cms_app -d crsic_db --clean --if-exists C:\backups\crsic_db-YYYYMMDD-HHMMSS.dump
```

Then from `cms/`:

```powershell
npm run db:migrate
npm run db:status
```

### Media

Unzip the matching media archive over the repo so `cms/uploads/` and `img/cms/` match the restored DB `media_assets.public_path` rows.

### Public JSON

If a CMS publish went wrong:

```powershell
Copy-Item data\news.json.bak data\news.json -Force
# same for events.json / publications.json if needed
```

Or restore from the dated JSON folder taken in §1.

---

## 3. Super Admin password reset (no email)

1. Sign in as an existing Super Admin (or use local seed if you still have `SEED_*` in `.env.local`).
2. Open **User management** → choose the user → **Reset password**.
3. Communicate the new password out-of-band (phone / in person). Never email it through this product (no SMTP by policy).
4. Confirm audit log shows `user.reset_password`.

If **all** Super Admins are locked out (local only):

```powershell
cd cms
# Ensure SEED_SUPER_ADMIN_* are set in .env.local
npm run db:seed:super-admin
```

That upserts the seed Super Admin password from env. Rotate afterward and remove leftover seed passwords from chat notes.

---

## 4. Offboarding a staff account

**Prefer soft offboarding:**

1. Super Admin → **User management** → **Deactivate**.
2. Confirm they cannot log in (`auth.login.fail` / inactive).
3. Reassign in-flight items if needed (content reassign or hard-delete flow).
4. Reviewer exclusive org claims are released on hard delete; on deactivate, reassign their orgs via **Edit scopes** if another Reviewer must take over.
5. Optional: reset password to a random unused value after deactivate.
6. Audit should show `user.deactivate`.

**Hard delete (destructive, SA only):**

1. **Delete…** on the user → review impact (draft count + non-draft list).
2. If any **non-draft** items exist, choose a reassignment target (active user) — required before delete.
3. Type the user’s email to confirm.
4. Drafts authored by the user are deleted; non-drafts move to the reassignment target; leftover FK refs (revisions/comments/media) rehomed; audit `user.delete`.

Deactivate remains the default recommendation when you only need to block login.

**Org scopes:** Super Admin → **Org scopes** (`/dashboard/org-units`). Type sets are **fixed by kind**: centre-wide = SPA five; research_dept = `research_group` + `research_project`. Manage group/project **instances** under Research groups / Research projects. SPA types remain unique across orgs; research types may exist on every research dept. Editor exclusivity: SPA types global; research types per org.

**Research seed:** `cd cms && npm run db:seed:research-groups` creates the 8 locale teams as published groups, seeds one sample project under `quranic-miracles` (legacy page 244), and rebuilds `data/research-groups.json` + `data/research-projects.json`.

**Research smoke:** `cd cms && npm run db:smoke:research` — SA author + smoke Reviewer four-eyes for group then project; verifies public JSON; purges smoke rows and rebuilds research JSON. Optional SPA check: `KEEP_RESEARCH_SMOKE=1 npm run db:smoke:research` then refresh `#research` (cleanup afterward with `npm run db:cleanup:smoke`).

**Editor content types (exclusivity):** SPA types — at most one Editor CMS-wide. Research types — at most one Editor **per org**. Types must appear in the union of that Editor’s org catalogs.

---

## 5. Publish cutover caution

First CMS publish for a content type **replaces** that public JSON with **CMS-published items only** (`.bak` first). Until a full re-import of legacy static content exists, treat publish as destructive for legacy cards. Prefer smoke items + unpublish + restore from `.bak` / snapshot during testing.

---

## 6. Health checks

| Check | How |
|-------|-----|
| DB | `http://localhost:3000/api/health/db` |
| Migrations | `cd cms && npm run db:status` |
| Automated smoke | `cd cms && npm run db:smoke` |
| Research smoke | `cd cms && npm run db:smoke:research` |
| Manual smoke | [SMOKE-CMS.md](../qa/SMOKE-CMS.md) |
| Audit | `/dashboard/audit` (Super Admin) |

---

## 7. Legacy JSON cutover

See [CMS-CUTOVER.md](./CMS-CUTOVER.md) for the full policy and the `npm run db:import-legacy`
step that imports the current `data/*.json` into the CMS as live items **before** the first
production publish (so no legacy cards are lost).

---

## 8. Backup / restore drill

### Drill log

| Date | Action | Result |
|------|--------|--------|
| 2026-07-20 | Attempted DB backup with `pg_dump` on the dev Windows machine | **pg_dump NOT available** — not on `PATH` and no `C:\Program Files\PostgreSQL\*\bin\pg_dump.exe` found. Documented SQL fallback below. |
| 2026-07-20 | Public JSON safety verified | `npm run db:smoke` snapshots `data/news.json`, publishes, unpublishes, and **restores** it — confirmed no wipe. |

> The PostgreSQL **client tools** (`pg_dump`, `pg_restore`, `psql`) are not installed on this
> dev machine even though the server (`crsic_db`) is reachable via `DATABASE_URL`. Install the
> matching PostgreSQL client tools (or run the dump from the DB host / a machine that has them)
> before relying on the `pg_dump` path in §1.

### Exact commands (run once client tools are available)

```powershell
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
pg_dump -h localhost -U crsic_cms_app -d crsic_db -Fc -f "C:\backups\crsic_db-$stamp.dump"
```

### SQL fallback export (no pg_dump)

If `pg_dump` is unavailable, take a logical export per table via `psql \copy` (client-side, no
server file permissions needed):

```powershell
# One CSV per table (adjust the table list as the schema grows)
foreach ($t in "users","org_units","user_org_scopes","user_content_scopes","content_items","content_revisions","notifications","media_assets","audit_log","schema_migrations") {
  psql "$env:DATABASE_URL" -c "\copy (SELECT * FROM $t) TO 'C:\backups\crsic-$t.csv' WITH (FORMAT csv, HEADER)"
}
```

If even `psql` is missing, a Node fallback can stream each table to CSV using the app's `pg`
pool (write an ad-hoc script under `cms/scripts/`, run with `--env-file=.env.local`, and store
output **outside** the repo). **Never commit dump/CSV files** — `C:\backups\` is off-repo by design.
