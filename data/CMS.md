# Connecting published content (CDN / remote JSON)

The public SPA reads static JSON via `CONTENT_BASE_URL` in `js/config.js`. Leave it empty to use local `/data` files. **Live `main` (2026-08-21)** already contains the WordPress-cutover snapshots plus `featured-news.json`.

## Contract (required endpoints)

When `CONTENT_BASE_URL` is set (e.g. `https://cdn.example.com/crsic/`), the app fetches **all** of these filenames (same shapes as local `/data`):

| Path | Shape |
|------|--------|
| `news.json` | `{ "news": object[] }` — `id`, `slug`, `date`, `title`, `label`, `summary`, `body`, `img`, `media[]`, bylines (`editor_*`, `reviewer_*`, `publisher_*`), optional SEO |
| `featured-news.json` | `{ "ids": string[] }` — ordered public news ids for `#home-feat-carousel`, max 10. Empty or all missing → SPA shows 3 newest news. CMS: `/dashboard/featured-news` |
| `events.json` | `{ "intl": object[], "nat": object[] }` — detail + `status` (`upcoming` \| `ongoing` \| `done`) + bylines + optional SEO |
| `publications.json` | `{ "covers": string[], "pubs": object[] }` — SPA uses each pub’s `media[]`; keep `covers.length === pubs.length` |
| `partners.json` | `{ "nat": object[], "intl": object[] }` — optional summary/body + SEO |
| `alerts.json` | `{ "items": object[] }` — at most one live item |
| `laws.json` | `{ "laws": object[] }` — hub `#laws`; detail `#law/{slug}`; optional `externalUrl` |
| `platforms.json` | `{ "platforms": object[] }` — `kind`: visual \| radio \| mobility; hub `#platforms`; detail `#platform/{slug}` |
| `research-groups.json` | `{ "items": object[] }` |
| `research-projects.json` | `{ "items": object[] }` |
| `director.json` | singleton `{ quote_ar, quote_en, name_ar, name_en, role_ar, role_en, portrait, … }` — CMS `/dashboard/director`. Soft-fail: SPA keeps locale placeholders |
| `journals.json` | `{ "journals": object[] }` — **not** CMS-published (OJS) |
| `locales/ar.json` | flat key → string (350 keys; must match EN) |
| `locales/en.json` | flat key → string |

SPA deep links (hash): `#news`, `#news/{slug}`, `#event/{slug}`, `#publication/{slug}`, `#partner/{slug}`, `#research-group/{slug}`, `#research-project/{slug}`, `#law/{slug}`, `#platform/{slug}`, `#laws`, `#platforms`. Preview (CMS A1): `#preview/{token}` — SPA fetches `{PREVIEW_API_BASE}/api/public/preview/{token}` (see `js/config.js`). Does not touch live JSON.

Set CMS `PUBLIC_SITE_URL` to the SPA origin so “Open public preview” opens the right tab. Set SPA `PREVIEW_API_BASE` to the CMS origin when they differ.

**Body HTML allowlist (news/events/pubs):** `p`, `br`, `strong`/`b`, `em`/`i`, `ul`/`ol`/`li`, `a[href]` (http/https/mailto). Plain text remains valid; the SPA renders either safely.

Field schemas: [README.md](./README.md) (this folder). Full product docs: [docs/README.md](../docs/README.md). Root product SSOT: [README.md](../README.md) §4.

## Enable remote published snapshots

```js
// js/config.js
export const CONTENT_BASE_URL = 'https://your-cdn.example.com/crsic/';
```

Leave `''` to use local `/data` files.

Publish these same filenames at the content base so the public SPA needs no rewrite.

**Event status:** `upcoming` | `ongoing` | `done` (badge on SPA cards).
