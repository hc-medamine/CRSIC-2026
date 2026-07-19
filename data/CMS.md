# Connecting published content (CDN / remote JSON)

The public SPA reads static JSON via `CONTENT_BASE_URL` in `js/config.js`. Leave it empty to use local `/data` files.

## Contract (required endpoints)

When `CONTENT_BASE_URL` is set (e.g. `https://cdn.example.com/crsic/`), the app fetches:

| Path | Shape |
|------|--------|
| `publications.json` | `{ "covers": string[], "pubs": object[] }` |
| `events.json` | `{ "intl": object[], "nat": object[] }` |
| `partners.json` | `{ "nat": object[], "intl": object[] }` |
| `journals.json` | `{ "journals": object[] }` |
| `news.json` | `{ "news": object[] }` |
| `locales/ar.json` | flat key → string |
| `locales/en.json` | flat key → string |

Field schemas: [README.md](./README.md) (this folder). Full product docs: [docs/README.md](../docs/README.md).

## Enable remote published snapshots

```js
// js/config.js
export const CONTENT_BASE_URL = 'https://your-cdn.example.com/crsic/';
```

Leave `''` to use local `/data` files.

Publish these same filenames at the content base so the public SPA needs no rewrite.
