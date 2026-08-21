# Content data (`/data`)

Static JSON files loaded at runtime by `js/data.js` / `js/i18n.js` via `fetch()`.
Edit these files to update site content — no JavaScript changes required.

Serve the site over **HTTP** (not `file://`) so modules and fetch work.

Optional CMS/CDN: see [CMS.md](./CMS.md) and `CONTENT_BASE_URL` in `js/config.js`.

Project docs index: [docs/README.md](../docs/README.md).

## Files

| File | Contents |
|------|----------|
| `publications.json` | CMS-published `pubs[]` (each item has `media[]`). `covers[]` is a derived parallel array for older consumers; the SPA reads each pub’s `media` first |
| `events.json` | `intl[]` + `nat[]` events (detail: `id`, `slug`, `summary`, `body`, `media[]`) |
| `partners.json` | `nat[]` + `intl[]` partners |
| `alerts.json` | `items[]` — site-wide banner, at most one live item (empty array when none) |
| `research-groups.json` | `items[]` — research groups by `orgUnitId` (CMS-published) |
| `research-projects.json` | `items[]` — research projects with `groupId` (CMS-published); detail via `#research-project/{slug}` |
| `journals.json` | `journals[]` |
| `news.json` | `news[]` (detail: `id`, `slug`, `summary`, `body`, `media[]`) |
| `locales/ar.json` | Arabic UI chrome strings (flat key → string) |
| `locales/en.json` | English UI chrome strings (same keys as `ar`) |

## Edit UI labels (i18n)

1. Open `locales/ar.json` and/or `locales/en.json`.
2. Change the string for the key used in HTML (`data-i18n="nav_home"`, etc.).
3. Keep **the same keys** in both files.
4. Values for `data-i18n-html` may include `<br>` only — no other HTML.

## Add a publication

Prefer **CMS publish** (upload cover → Review → Publish). That writes `pubs[].media[]` and a matching `covers[]` entry, and copies the file to `img/cms/covers/` (tracked in git).

For a rare hand edit:

1. Put the cover under `img/cms/covers/` (CMS hashed name) or `img/covers/` (legacy filename).
2. Append a matching object to `pubs` with `media[].src` set to that path.
3. Append the same path to `covers` so `covers.length === pubs.length`.

```json
{
  "t": "عنوان المؤلف",
  "type": "collective",
  "dept": "الحضارة الإسلامية",
  "desc": "وصف مختصر دون وسوم HTML.",
  "id": "legacy-publication-عنوان-المؤلف",
  "slug": "عنوان-المؤلف",
  "summary": "وصف مختصر دون وسوم HTML.",
  "body": "",
  "media": [{ "kind": "image", "src": "img/cms/covers/<hash>.jpg" }]
}
```

`type` must be `"collective"` or `"individual"`.  
The SPA cards and details use each item’s CMS `media` (then `img` / `cover`).  
Public deep link: `#publication/{slug}`.

## Add an event

Append to `intl` or `nat` in `events.json`:

```json
{
  "day": "15",
  "month": "ماي",
  "year": "2026",
  "title": "عنوان الملتقى",
  "type": "ملتقى وطني",
  "status": "done",
  "img": "img/cms/events/<hash>.jpg",
  "id": "legacy-event-عنوان-الملتقى",
  "slug": "عنوان-الملتقى",
  "summary": "",
  "body": "",
  "media": [{ "kind": "image", "src": "img/cms/events/<hash>.jpg" }]
}
```

`status`: `"done"` or `"upcoming"`.  
`img` / `media` come from CMS publish (`img/cms/events/`). If an event has no image, the featured carousel may fall back to `img/Holders/0.jpg`–`5.jpg`.  
Deep link: `#event/{slug}`.

The home section `#home-events-grid` shows the **3 newest** events (intl + nat merged, sorted by date). The full events page still lists every item by year.

## Add a site alert

`alerts.json` holds **at most one** live item — the site-wide banner shown under the language banner:

```json
{
  "items": [
    {
      "id": "unique-id",
      "message_ar": "نص التنبيه بالعربية",
      "message_en": "Alert message in English",
      "link": null,
      "link_label_ar": "",
      "link_label_en": ""
    }
  ]
}
```

Use `"items": []` when there is no active alert. `link` is optional (`null` or a URL); when set, `link_label_ar`/`link_label_en` label the button. A visitor who dismisses an alert won't see it again for the rest of the browser session unless a new `id` is published.

## Add news

```json
{
  "img": "img/cms/news/<hash>.jpg",
  "label": "خبر",
  "title": "عنوان الخبر",
  "id": "legacy-news-عنوان-الخبر",
  "slug": "عنوان-الخبر",
  "summary": "",
  "body": "",
  "media": [{ "kind": "image", "src": "img/cms/news/<hash>.jpg" }]
}
```

Use `"img": null` when there is no photo. Deep link: `#news/{slug}`.

`media[]` entries: `{ "kind": "image"|"pdf", "src": "…", "alt": "optional" }`.

To re-backfill id/slug/media on legacy files: `node scripts/backfill-public-detail-fields.mjs`.
## Editor rules

- Save as **UTF-8** (Arabic text).
- Valid JSON only — trailing commas will break the load.
- Do **not** put raw HTML in content string fields — the app uses `textContent` (P2).
- After editing, refresh the site (hard refresh if the host caches JSON).

## Technical notes

- Default paths resolve via `js/config.js` → `../data/...` (works in subdirectories).
- Set `CONTENT_BASE_URL` to serve the same filenames from a CDN/CMS.
- Failed files soft-fail: other sections still render; a banner lists failed resources.
- Legacy `/about.html` redirects: `.htaccess` (Apache), `_redirects` (Netlify), `vercel.json` (Vercel).
