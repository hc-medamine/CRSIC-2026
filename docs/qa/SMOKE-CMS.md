# Smoke checklist — CRSIC internal CMS

Run on branch `feature/step4-internal-cms` with Postgres up and `cd cms && npm run dev`.  
Use **two accounts** (four-eyes): one Editor (or Super Admin as author) and a **different** Reviewer.

Estimated time: **~10 minutes**.

**Danger:** Publishing from CMS **replaces** the matching public JSON with CMS-published items only (writes `.bak` first). Prefer smoke items you will unpublish, or restore from `.bak` afterward.

---

## A. Auth & audit

| # | Check | Pass? |
|---|--------|-------|
| A1 | Login with Super Admin works | ☐ |
| A2 | Bad password shows error; `/dashboard/audit` shows `auth.login.fail` | ☐ |
| A3 | Successful login appears as `auth.login.success` | ☐ |
| A4 | Logout works; audit shows `auth.logout` | ☐ |

## B. Users (Super Admin)

| # | Check | Pass? |
|---|--------|-------|
| B1 | Create Editor + Reviewer (or confirm they exist) | ☐ |
| B2 | Audit shows `user.create` | ☐ |
| B3 | Reset password / deactivate works; audit entries exist | ☐ |

## C. News path (four-eyes)

| # | Check | Pass? |
|---|--------|-------|
| C1 | Editor: create draft + upload image (alt AR) | ☐ |
| C2 | Submit with checklist | ☐ |
| C3 | Same user cannot approve (four-eyes message) | ☐ |
| C4 | Other Reviewer: approve → publish | ☐ |
| C5 | Audit: `news.submit`, `news.approve`, `news.publish` | ☐ |
| C6 | Unpublish; restore `data/news.json` from `.bak` if needed | ☐ |

## D. Events path

| # | Check | Pass? |
|---|--------|-------|
| D1 | Draft → submit → (other) approve → publish | ☐ |
| D2 | Audit `event.*` + optional unpublish / restore `.bak` | ☐ |

## E. Publications path

| # | Check | Pass? |
|---|--------|-------|
| E1 | Draft + cover upload → submit → approve → publish | ☐ |
| E2 | Published JSON keeps `covers.length === pubs.length` | ☐ |
| E3 | Unpublish / restore `.bak` if smoke-only | ☐ |

## F. Media

| # | Check | Pass? |
|---|--------|-------|
| F1 | `/dashboard/media` upload image + PDF | ☐ |
| F2 | Replace keeps same public path | ☐ |
| F3 | Audit `media.upload` / `media.replace` | ☐ |

## G. Gate

| # | Check | Pass? |
|---|--------|-------|
| G1 | No known bugs on this path | ☐ |
| G2 | Public SPA still loads (if you published, verify or restore JSON) | ☐ |

---

When **all** boxes pass with zero friction → eligible to merge `feature/step4-internal-cms` → `main`.
