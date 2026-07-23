# Connecting published content (CDN / remote JSON)

The public SPA reads static JSON via `CONTENT_BASE_URL` in `js/config.js`. Leave it empty to use local `/data` files.

## Contract (required endpoints)

When `CONTENT_BASE_URL` is set (e.g. `https://cdn.example.com/crsic/`), the app fetches:

| Path | Shape |
|------|--------|
| `news.json` | `{ "news": object[] }` — items may include detail fields (`summary`, `body` as plain text or sanitized HTML allowlist) + optional SEO: `meta_title_ar`/`meta_title_en`, `meta_description_ar`/`meta_description_en`, `og_image` |
| `events.json` | `{ "intl": object[], "nat": object[] }` — items may include detail (`body` same allowlist) + same optional SEO fields |
| `publications.json` | `{ "covers": string[], "pubs": object[] }` — pubs may include `id`, `slug`, `summary`, `body` (sanitized HTML allowlist), `media[]` + optional SEO fields |
| `partners.json` | `{ "nat": object[], "intl": object[] }` — optional SEO fields on items |
| `alerts.json` | `{ "items": object[] }` — at most one live item; each has `id`, `message_ar`, `message_en`, `link`, `link_label_ar`, `link_label_en` + optional SEO fields |
| `research-groups.json` | `{ "items": object[] }` — `id`, `slug`, `orgUnitId`, `name_ar`/`name_en`, `summary_*`, optional `lead_*` / `members` |
| `research-projects.json` | `{ "items": object[] }` — `id`, `slug`, `orgUnitId`, `groupId`, title/lead/dibaja/questions/duration AR+EN, `axes[]`/`impacts[]` (`{ar,en?}`), optional SEO |
| `locales/ar.json` | flat key → string |
| `locales/en.json` | flat key → string |

SPA deep links (hash): `#news/{slug}`, `#event/{slug}`, `#publication/{slug}`, `#research-project/{slug}`. Preview (CMS A1): `#preview/{token}` — SPA fetches a short-lived candidate payload from `{PREVIEW_API_BASE}/api/public/preview/{token}` (see `js/config.js`). Does not touch live JSON.

Set CMS `PUBLIC_SITE_URL` to the SPA origin so “Open public preview” opens the right tab. Set SPA `PREVIEW_API_BASE` to the CMS origin when they differ.

**Body HTML allowlist (news/events/pubs):** `p`, `br`, `strong`/`b`, `em`/`i`, `ul`/`ol`/`li`, `a[href]` (http/https/mailto). Plain text remains valid; the SPA renders either safely.

Field schemas: [README.md](./README.md) (this folder). Full product docs: [docs/README.md](../docs/README.md).

## Enable remote published snapshots

```js
// js/config.js
export const CONTENT_BASE_URL = 'https://your-cdn.example.com/crsic/';
```

Leave `''` to use local `/data` files.

Publish these same filenames at the content base so the public SPA needs no rewrite.
