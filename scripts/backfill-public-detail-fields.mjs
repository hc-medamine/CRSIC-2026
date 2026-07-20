/**
 * One-time enrich of public JSON with id/slug/summary/body/media for detail pages.
 * Usage: node scripts/backfill-public-detail-fields.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function slugifyTitle(title) {
  const base = String(title || "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return (base || "item").replace(/[A-Za-z]+/g, (m) => m.toLowerCase());
}

function uniqueSlug(base, used) {
  let candidate = base || "item";
  if (!used.has(candidate)) {
    used.add(candidate);
    return candidate;
  }
  let n = 2;
  while (used.has(`${base}-${n}`)) n += 1;
  const out = `${base}-${n}`;
  used.add(out);
  return out;
}

function enrichItem(item, type, titleKey, used, coverPath) {
  const title = item[titleKey] || item.title || "";
  const slug = item.slug || uniqueSlug(slugifyTitle(title), used);
  const id = item.id || `legacy-${type}-${slug}`;
  const media =
    Array.isArray(item.media) && item.media.length
      ? item.media
      : coverPath || item.img
        ? [{ kind: "image", src: coverPath || item.img }]
        : [];
  return {
    ...item,
    id,
    slug,
    summary: item.summary ?? item.desc ?? "",
    body: item.body ?? "",
    media,
  };
}

function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 4) + "\n", "utf8");
}

const newsPath = join(root, "data", "news.json");
const newsData = JSON.parse(readFileSync(newsPath, "utf8"));
const newsUsed = new Set();
newsData.news = (newsData.news || []).map((n) => enrichItem(n, "news", "title", newsUsed));
writeJson(newsPath, newsData);

const eventsPath = join(root, "data", "events.json");
const eventsData = JSON.parse(readFileSync(eventsPath, "utf8"));
const eventUsed = new Set();
eventsData.intl = (eventsData.intl || []).map((e) => enrichItem(e, "event", "title", eventUsed));
eventsData.nat = (eventsData.nat || []).map((e) => enrichItem(e, "event", "title", eventUsed));
writeJson(eventsPath, eventsData);

const pubsPath = join(root, "data", "publications.json");
const pubsData = JSON.parse(readFileSync(pubsPath, "utf8"));
const pubUsed = new Set();
const covers = pubsData.covers || [];
pubsData.pubs = (pubsData.pubs || []).map((p, i) =>
  enrichItem(p, "publication", "t", pubUsed, covers[i]),
);
writeJson(pubsPath, pubsData);

console.log(
  `Backfill done: news=${newsData.news.length} events=${eventsData.intl.length + eventsData.nat.length} pubs=${pubsData.pubs.length}`,
);
