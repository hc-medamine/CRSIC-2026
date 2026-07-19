# Content data (`/data`)

Static JSON files loaded at runtime by `js/data.js` / `js/i18n.js` via `fetch()`.
Edit these files to update site content — no JavaScript changes required.

Serve the site over **HTTP** (not `file://`) so modules and fetch work.

Optional CMS/CDN: see [CMS.md](./CMS.md) and `CONTENT_BASE_URL` in `js/config.js`.

Project docs index: [docs/README.md](../docs/README.md).

## Files

| File | Contents |
|------|----------|
| `publications.json` | `covers[]` + `pubs[]` (same length; index-aligned) |
| `events.json` | `intl[]` + `nat[]` events |
| `partners.json` | `nat[]` + `intl[]` partners |
| `journals.json` | `journals[]` |
| `news.json` | `news[]` |
| `locales/ar.json` | Arabic UI chrome strings (flat key → string) |
| `locales/en.json` | English UI chrome strings (same keys as `ar`) |

## Edit UI labels (i18n)

1. Open `locales/ar.json` and/or `locales/en.json`.
2. Change the string for the key used in HTML (`data-i18n="nav_home"`, etc.).
3. Keep **the same keys** in both files.
4. Values for `data-i18n-html` may include `<br>` only — no other HTML.

## Add a publication

1. Add a cover image under `img/covers/` (e.g. `c28.jpg`).
2. Append the path to `covers` in `publications.json`.
3. Append a matching object to `pubs`:

```json
{
  "t": "عنوان المؤلف",
  "type": "collective",
  "dept": "الحضارة الإسلامية",
  "desc": "وصف مختصر دون وسوم HTML."
}
```

`type` must be `"collective"` or `"individual"`.  
**Keep `covers.length === pubs.length`.**

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
  "img": "img/Holders/0.jpg"
}
```

`status`: `"done"` or `"upcoming"`.  
`img` is **optional** — used by the home teaser cards; if omitted, the home grid cycles `img/Holders/0.jpg`–`5.jpg`.

The home section `#home-events-grid` shows the **3 newest** events (intl + nat merged, sorted by date). The full events page still lists every item by year.
## Add news

```json
{
  "img": "img/Holders/0.jpg",
  "label": "خبر",
  "title": "عنوان الخبر"
}
```

Use `"img": null` when there is no photo.

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
