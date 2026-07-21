# Connecting published content (CDN / remote JSON)

The public SPA reads static JSON via `CONTENT_BASE_URL` in `js/config.js`. Leave it empty to use local `/data` files.

## Contract (required endpoints)

When `CONTENT_BASE_URL` is set (e.g. `https://cdn.example.com/crsic/`), the app fetches:

| Path | Shape |
|------|--------|
| `publications.json` | `{ "covers": string[], "pubs": object[] }` — pubs may include `id`, `slug`, `summary`, `body`, `media[]` |
| `events.json` | `{ "intl": object[], "nat": object[] }` — items may include detail fields |
| `partners.json` | `{ "nat": object[], "intl": object[] }` |
| `alerts.json` | `{ "items": object[] }` — at most one live item; each has `id`, `message_ar`, `message_en`, `link`, `link_label_ar`, `link_label_en` |
| `journals.json` | `{ "journals": object[] }` |
| `news.json` | `{ "news": object[] }` — items may include detail fields |
| `locales/ar.json` | flat key → string |
| `locales/en.json` | flat key → string |
| `site-copy.json` | `{ "ar": object, "en": object }` — CMS-published overlay merging every published static page (about / cooperation / org / contact); flat key → string per language, same keys as `locales/*.json`. Empty objects (`{}`) until a page is published. |

SPA deep links (hash): `#news/{slug}`, `#event/{slug}`, `#publication/{slug}`.

Field schemas: [README.md](./README.md) (this folder). Full product docs: [docs/README.md](../docs/README.md).

## Enable remote published snapshots

```js
// js/config.js
export const CONTENT_BASE_URL = 'https://your-cdn.example.com/crsic/';
```

Leave `''` to use local `/data` files.

Publish these same filenames at the content base so the public SPA needs no rewrite.
