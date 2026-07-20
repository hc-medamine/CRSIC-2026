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

1. Super Admin → **User management** → **Deactivate** (do not delete the row — audit and authorship must keep the name).
2. Confirm they cannot log in (`auth.login.fail` / inactive).
3. Reassign in-flight drafts: have another Editor take over, or Super Admin edit drafts if needed.
4. Reviewer scopes are centre-wide; no extra revoke beyond deactivate.
5. Optional: reset password to a random unused value after deactivate.
6. Audit should show `user.deactivate`.

Do **not** delete users in MVP — preserves `created_by` / audit actor history.

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
| Manual smoke | [SMOKE-CMS.md](../qa/SMOKE-CMS.md) |
| Audit | `/dashboard/audit` (Super Admin) |
