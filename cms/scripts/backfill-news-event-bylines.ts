/**
 * Backfill public news date + news/event bylines (PRD 2026-08-21).
 *
 * Usage (from cms/):
 *   npm run db:backfill:bylines            # dry-run
 *   npm run db:backfill:bylines -- --apply
 */
import { query, pool } from "../src/lib/db";
import {
  loadPublicByline,
  PUBLIC_PUBLISHER_AR,
  PUBLIC_PUBLISHER_EN,
  resolveNewsStoryDate,
  toIsoDate,
} from "../src/lib/publish/publicByline";
import { rebuildPublicNewsJson } from "../src/lib/publish/newsJson";
import { rebuildPublicEventsJson } from "../src/lib/publish/eventsJson";
import {
  CRAWL_DELAY_MS,
  LISTING_HUBS,
  extractDetail,
  fetchText,
  listingCardsFromHtml,
  maxPaged,
  parseEventDate,
  sleep,
  titlesMatch,
  withPaged,
} from "./wp-cutover-lib";

type CmsItem = {
  id: string;
  content_type: "news" | "event";
  title_ar: string;
  public_slug: string | null;
  published_at: Date | null;
  live_payload: Record<string, unknown> | null;
};

type WpDateHit = { title: string; href: string; date: string };

function isoFromHint(hint: string | null | undefined): string {
  if (!hint) return "";
  const direct = toIsoDate(hint);
  if (direct) return direct;
  const parsed = parseEventDate(hint);
  if (!parsed.year || !parsed.day) return "";
  const monthMap: Record<string, string> = {
    يان: "01",
    ينا: "01",
    فيف: "02",
    مار: "03",
    أفر: "04",
    ماي: "05",
    جون: "06",
    جوي: "07",
    أوت: "08",
    سبت: "09",
    أكت: "10",
    نوف: "11",
    ديس: "12",
  };
  const month = parsed.month ? monthMap[parsed.month] : "";
  if (!month) return "";
  return `${parsed.year}-${month}-${parsed.day}`;
}

async function scrapeNewsDates(): Promise<WpDateHit[]> {
  const hubs = LISTING_HUBS.filter((h) => h.type === "news" && h.kind === "listing");
  const hits: WpDateHit[] = [];
  const seen = new Set<string>();
  for (const hub of hubs) {
    const first = await fetchText(hub.url);
    await sleep(CRAWL_DELAY_MS);
    const lastPage = Math.min(maxPaged(first), 40);
    const pages = [first];
    for (let p = 2; p <= lastPage; p += 1) {
      pages.push(await fetchText(withPaged(hub.url, p)));
      await sleep(CRAWL_DELAY_MS);
    }
    for (const html of pages) {
      for (const card of listingCardsFromHtml(html)) {
        const key = card.href.replace(/#.*$/, "").replace(/\/$/, "");
        if (seen.has(key)) continue;
        seen.add(key);
        hits.push({
          title: card.title,
          href: card.href,
          date: isoFromHint(card.dateHint),
        });
      }
    }
  }
  return hits;
}

function matchWpDate(title: string, slug: string | null, hits: WpDateHit[]): WpDateHit | null {
  const exact = hits.find((h) => titlesMatch(h.title, title));
  if (exact) return exact;
  if (!slug) return null;
  return (
    hits.find((h) => {
      try {
        const path = new URL(h.href).pathname.replace(/\/$/, "");
        return path.endsWith(`/${slug}`) || h.href.includes(slug);
      } catch {
        return h.href.includes(slug);
      }
    }) ?? null
  );
}

async function fillMissingDetailDates(hits: WpDateHit[]): Promise<void> {
  for (const hit of hits) {
    if (hit.date) continue;
    try {
      const html = await fetchText(hit.href);
      await sleep(CRAWL_DELAY_MS);
      const detail = extractDetail(html, hit.title);
      hit.date = toIsoDate(detail.publishedAt) || isoFromHint(detail.publishedAt);
    } catch {
      /* listing date is enough when the article page is gone */
    }
  }
}

async function main() {
  const apply = process.argv.includes("--apply");
  console.log(apply ? "APPLY: writing live_payload + public JSON" : "DRY-RUN: no writes");

  const cms = await query<CmsItem>(
    `SELECT id, content_type, title_ar, public_slug, published_at, live_payload
     FROM content_items
     WHERE content_type IN ('news', 'event') AND live_payload IS NOT NULL
     ORDER BY content_type, created_at`,
  );

  let wpDates: WpDateHit[] = [];
  try {
    wpDates = await scrapeNewsDates();
    await fillMissingDetailDates(wpDates.filter((h) => !h.date).slice(0, 80));
    console.log(`WP news dates scraped: ${wpDates.filter((h) => h.date).length}/${wpDates.length}`);
  } catch (err) {
    console.warn("WP scrape failed; news dates will use CMS published_at where needed.");
    console.warn(String(err instanceof Error ? err.message : err));
  }

  let newsWp = 0;
  let newsCms = 0;
  let newsEmpty = 0;
  let events = 0;

  for (const row of cms.rows) {
    const byline = await loadPublicByline(row.id);
    const live = { ...(row.live_payload || {}) };

    if (row.content_type === "news") {
      const hit = matchWpDate(row.title_ar, row.public_slug, wpDates);
      const story = resolveNewsStoryDate({
        publishedAt: row.published_at,
        liveDate: typeof live.date === "string" ? live.date : null,
        liveDateSource: typeof live.date_source === "string" ? live.date_source : null,
        liveSourcePublishedAt:
          typeof live.source_published_at === "string" ? live.source_published_at : null,
        wpDate: hit?.date || null,
      });
      if (story.date_source === "wp" && story.date) newsWp += 1;
      else if (story.date) newsCms += 1;
      else newsEmpty += 1;
      Object.assign(live, byline, {
        date: story.date,
        date_source: story.date_source,
        publisher_ar: PUBLIC_PUBLISHER_AR,
        publisher_en: PUBLIC_PUBLISHER_EN,
      });
      if (story.date_source === "wp" && story.date) live.source_published_at = story.date;
    } else {
      events += 1;
      Object.assign(live, byline, {
        publisher_ar: PUBLIC_PUBLISHER_AR,
        publisher_en: PUBLIC_PUBLISHER_EN,
      });
    }

    if (apply) {
      await query(`UPDATE content_items SET live_payload = $2::jsonb, updated_at = NOW() WHERE id = $1`, [
        row.id,
        JSON.stringify(live),
      ]);
    }
  }

  console.log(
    `News: ${newsWp} WP dates, ${newsCms} CMS dates, ${newsEmpty} empty. Events bylined: ${events}.`,
  );

  if (!apply) {
    console.log("Re-run with --apply to write DB + data/news.json + data/events.json.");
    return;
  }

  const newsOut = await rebuildPublicNewsJson();
  const eventsOut = await rebuildPublicEventsJson();
  console.log(`Rebuilt news.json (${newsOut.count}) and events.json (intl ${eventsOut.intl}, nat ${eventsOut.nat}).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
