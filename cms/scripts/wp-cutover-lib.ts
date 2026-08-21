/**
 * WordPress HTML scrape helpers for the CMS-owned-types cutover.
 * Listing hubs are classified by known page_id / category — not by guessing chrome.
 */
import { slugifyTitle } from "../src/lib/publish/slug";
import { sanitizeBodyHtml, plainTextToBodyHtml } from "../src/lib/content/sanitizeBody";

export const WP_ORIGIN = "https://www.crsic.dz";
export const USER_AGENT =
  "CRSIC-CMS-cutover/1.0 (+https://github.com/hc-medamine/CRSIC-2026; ops@crsic.dz)";
export const CRAWL_DELAY_MS = 400;
export const VOLUME_SOFT_CAP = 200;
export const SUMMARY_SOFT_MAX = 220;

export type CmsType =
  | "news"
  | "event"
  | "publication"
  | "partner"
  | "alert"
  | "law"
  | "platform"
  | "research_group"
  | "research_project";

export type HubKind = "listing" | "page";

export type ListingHub = {
  kind: HubKind;
  type: CmsType;
  url: string;
  label: string;
  eventScope?: "intl" | "nat";
  eventTypeAr?: string;
  partnerScope?: "intl" | "nat";
  platformKind?: "visual" | "radio" | "mobility";
  orgUnitId?: string;
  newsLabel?: string;
};

/** Public WP listing / landing pages that map to CMS-owned types. */
export const LISTING_HUBS: ListingHub[] = [
  {
    kind: "listing",
    type: "news",
    url: `${WP_ORIGIN}/?cat=64`,
    label: "مستجدات المركز",
    newsLabel: "خبر",
  },
  {
    kind: "listing",
    type: "event",
    url: `${WP_ORIGIN}/?page_id=691`,
    label: "مؤتمرات دولية",
    eventScope: "intl",
    eventTypeAr: "مؤتمر دولي",
  },
  {
    kind: "listing",
    type: "event",
    url: `${WP_ORIGIN}/?page_id=2120`,
    label: "ملتقيات وطنية",
    eventScope: "nat",
    eventTypeAr: "ملتقى وطني",
  },
  {
    kind: "listing",
    type: "event",
    url: `${WP_ORIGIN}/?page_id=2258`,
    label: "محاضرات علمية",
    eventScope: "nat",
    eventTypeAr: "محاضرة علمية",
  },
  {
    kind: "listing",
    type: "event",
    url: `${WP_ORIGIN}/?page_id=2265`,
    label: "زيارات علمية",
    eventScope: "nat",
    eventTypeAr: "زيارة علمية",
  },
  {
    kind: "listing",
    type: "event",
    url: `${WP_ORIGIN}/?page_id=2271`,
    label: "دورات تكوينية",
    eventScope: "nat",
    eventTypeAr: "دورة تكوينية",
  },
  {
    kind: "listing",
    type: "partner",
    url: `${WP_ORIGIN}/?page_id=2278`,
    label: "شراكات وطنية",
    partnerScope: "nat",
  },
  {
    kind: "listing",
    type: "partner",
    url: `${WP_ORIGIN}/?page_id=2282`,
    label: "شراكات دولية",
    partnerScope: "intl",
  },
  {
    kind: "page",
    type: "platform",
    url: `${WP_ORIGIN}/?page_id=3197`,
    label: "منصة المحاضرات المرئية",
    platformKind: "visual",
  },
  {
    kind: "page",
    type: "platform",
    url: `${WP_ORIGIN}/?page_id=2613`,
    label: "الحصة الإذاعية للمركز",
    platformKind: "radio",
  },
  {
    kind: "page",
    type: "platform",
    url: `${WP_ORIGIN}/?page_id=21`,
    label: "منصة الحركية قصيرة المدى",
    platformKind: "mobility",
  },
  {
    kind: "page",
    type: "research_group",
    url: `${WP_ORIGIN}/?page_id=244`,
    label: "فرقة الإعجاز في القرآن والسنة",
    orgUnitId: "dept_quran_fiqh",
  },
  {
    kind: "page",
    type: "research_group",
    url: `${WP_ORIGIN}/?page_id=256`,
    label: "فرقة الدراسات الفقهية",
    orgUnitId: "dept_quran_fiqh",
  },
  {
    kind: "page",
    type: "research_group",
    url: `${WP_ORIGIN}/?page_id=263`,
    label: "فرقة حوار الحضارات",
    orgUnitId: "dept_thought_dialogue",
  },
  {
    kind: "page",
    type: "research_group",
    url: `${WP_ORIGIN}/?page_id=260`,
    label: "فرقة العقائد والمذاهب",
    orgUnitId: "dept_thought_dialogue",
  },
  {
    kind: "page",
    type: "research_group",
    url: `${WP_ORIGIN}/?page_id=266`,
    label: "فرقة التراث الثقافي",
    orgUnitId: "dept_algeria_history",
  },
  {
    kind: "page",
    type: "research_group",
    url: `${WP_ORIGIN}/?page_id=270`,
    label: "فرقة الأعلام الجزائريين",
    orgUnitId: "dept_algeria_history",
  },
  {
    kind: "page",
    type: "research_group",
    url: `${WP_ORIGIN}/?page_id=277`,
    label: "فرقة الحضارة الإسلامية والمجتمع",
    orgUnitId: "dept_islamic_civ",
  },
  {
    kind: "page",
    type: "research_group",
    url: `${WP_ORIGIN}/?page_id=274`,
    label: "فرقة دراسات في الاقتصاد الإسلامي",
    orgUnitId: "dept_islamic_civ",
  },
];

export type ScrapedItem = {
  type: CmsType;
  hubLabel: string;
  hubUrl: string;
  url: string;
  title: string;
  summaryAr: string;
  bodyAr: string;
  imageUrl: string | null;
  pdfUrls: string[];
  publishedAt: string | null;
  eventScope?: "intl" | "nat";
  eventTypeAr?: string;
  eventDay?: string | null;
  eventMonth?: string | null;
  eventYear?: string | null;
  partnerScope?: "intl" | "nat";
  platformKind?: "visual" | "radio" | "mobility";
  orgUnitId?: string;
  newsLabel?: string;
};

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchText(url: string): Promise<string> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/rss+xml,application/xhtml+xml,*/*",
        },
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      return await res.text();
    } catch (err) {
      lastErr = err;
      await sleep(700 * (attempt + 1));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export async function fetchBuffer(
  url: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return { buffer, contentType: res.headers.get("content-type") || "" };
  } catch {
    return null;
  }
}

export function absUrl(href: string, base = WP_ORIGIN): string {
  try {
    return new URL(href, `${base}/`).href;
  } catch {
    return href;
  }
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\s+/g, " ")
    .trim();
}

export function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " "));
}

/** Collapse Arabic for title/slug matching. */
export function normalizeMatchKey(value: string): string {
  return value
    .normalize("NFC")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .toLowerCase();
}

export function titlesMatch(a: string, b: string): boolean {
  const ka = normalizeMatchKey(a);
  const kb = normalizeMatchKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  if (ka.length >= 12 && kb.length >= 12 && (ka.includes(kb) || kb.includes(ka))) return true;
  return slugifyTitle(a) === slugifyTitle(b);
}

const SKIP_IMG =
  /logo|favicon|sprite|emoji|gravatar|wp-includes|facebook|twitter|icon-|\.svg(\?|$)/i;

export function unwrapSrc(src: string): string {
  return src.replace(/-\d{2,4}x\d{2,4}(?=\.(jpe?g|png|webp))/i, "");
}

export function listingCardsFromHtml(html: string): Array<{
  title: string;
  href: string;
  img: string | null;
  dateHint: string | null;
}> {
  const out: Array<{ title: string; href: string; img: string | null; dateHint: string | null }> =
    [];
  const seen = new Set<string>();

  const push = (hrefRaw: string, titleRaw: string, imgRaw: string | null, dateHint: string | null) => {
    const href = absUrl(hrefRaw);
    const title = stripTags(titleRaw).replace(/\s*[-|–]\s*CRSIC\s*$/i, "");
    if (!title || title.length < 4) return;
    if (!/[?&]p=\d+/i.test(href) && !/\/20\d{2}\//.test(href)) return;
    if (/wp-admin|ojsre|\/feed\/|respond/i.test(href)) return;
    const key = href.replace(/#.*$/, "").replace(/\/$/, "");
    if (seen.has(key)) return;
    seen.add(key);
    const img = imgRaw && !SKIP_IMG.test(imgRaw) ? unwrapSrc(absUrl(imgRaw)) : null;
    out.push({ title, href, img, dateHint });
  };

  const blocks = html.split(/wp-show-posts-inner/);
  for (const block of blocks.slice(1)) {
    const titleMatch = block.match(
      /<h2[^>]*>\s*<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>\s*<\/h2>/i,
    );
    if (!titleMatch) continue;
    const imgMatch = block.match(/<img[^>]+src=["']([^"']+)["']/i);
    const dateMatch = block.match(
      /(يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر)[^<]{0,48}\d{4}/,
    );
    push(titleMatch[1], titleMatch[2], imgMatch?.[1] ?? null, dateMatch?.[0] ?? null);
  }

  const articles = html.matchAll(
    /<article\b[\s\S]*?<\/article>/gi,
  );
  for (const art of articles) {
    const block = art[0];
    const titleMatch =
      block.match(
        /<h[12][^>]*>\s*<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>\s*<\/h[12]>/i,
      ) ||
      block.match(/<a[^>]+href=["']([^"']+)["'][^>]*rel=["']bookmark["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!titleMatch) continue;
    const imgMatch = block.match(/<img[^>]+src=["']([^"']+)["']/i);
    const timeMatch = block.match(/datetime=["']([^"']+)["']/i);
    push(titleMatch[1], titleMatch[2], imgMatch?.[1] ?? null, timeMatch?.[1] ?? null);
  }

  const pagelayer = html.split(/pagelayer-wposts-post/);
  for (const block of pagelayer.slice(1)) {
    const titleMatch =
      block.match(/pagelayer-wposts-title[^>]*>\s*([\s\S]*?)\s*<\/div>/i) ||
      block.match(/rel=["']bookmark["'][^>]*>\s*<div[^>]*>([\s\S]*?)<\/div>/i);
    const hrefMatch =
      block.match(/<a[^>]+href=["']([^"']+)["'][^>]*rel=["']bookmark["']/i) ||
      block.match(/<a[^>]+href=["']([^"']+\?p=\d+[^"']*)["']/i);
    if (!titleMatch || !hrefMatch) continue;
    const bg = block.match(/background\s*:\s*url\(([^)]+)\)/i)?.[1]?.replace(/['"]/g, "");
    const imgMatch = block.match(/<img[^>]+src=["']([^"']+)["']/i);
    const timeMatch = block.match(/datetime=["']([^"']+)["']/i);
    push(hrefMatch[1], titleMatch[1], bg || imgMatch?.[1] || null, timeMatch?.[1] ?? null);
  }

  return out;
}

export function maxPaged(html: string): number {
  const pages = [...html.matchAll(/[?&]paged=(\d+)/gi)].map((m) => Number(m[1]));
  return pages.length ? Math.max(1, ...pages) : 1;
}

export function withPaged(url: string, page: number): string {
  if (page <= 1) return url;
  const u = new URL(url);
  u.searchParams.set("paged", String(page));
  return u.href;
}

export type DetailExtract = {
  title: string;
  summaryAr: string;
  bodyAr: string;
  ogImage: string | null;
  pdfUrls: string[];
  publishedAt: string | null;
};

export function extractDetail(html: string, fallbackTitle = ""): DetailExtract {
  const ogTitle =
    html.match(/property=["']og:title["']\s+content=["']([^"']+)["']/i)?.[1] ||
    html.match(/content=["']([^"']+)["']\s+property=["']og:title["']/i)?.[1] ||
    "";
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "";
  const title = stripTags(ogTitle || h1 || fallbackTitle).replace(/\s*[-|–]\s*CRSIC\s*$/i, "");

  const og =
    html.match(/property=["']og:image["']\s+content=["']([^"']+)["']/i)?.[1] ||
    html.match(/content=["']([^"']+)["']\s+property=["']og:image["']/i)?.[1] ||
    null;

  const publishedAt =
    html.match(/<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)/i)?.[1] ||
    html.match(/datetime=["'](\d{4}-\d{2}-\d{2}[^"']*)["']/i)?.[1] ||
    null;

  const scope =
    html.match(/<article\b[\s\S]*?<\/article>/i)?.[0] ||
    html.match(/<div[^>]+class=["'][^"']*entry-content[^"']*["'][^>]*>[\s\S]*$/i)?.[0] ||
    html;

  const cleaned = scope
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "");

  const pdfUrls = [
    ...cleaned.matchAll(/href=["']([^"']+\.pdf(?:\?[^"']*)?)["']/gi),
  ]
    .map((m) => absUrl(m[1]))
    .filter((u, i, arr) => arr.indexOf(u) === i)
    .slice(0, 8);

  const paragraphs = [...cleaned.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => stripTags(m[1]))
    .filter((p) => {
      if (p.length < 24) return false;
      if (/اترك تعليقا|Leave a Reply|Share on|احفظ اسمي|جميع الحقوق/i.test(p)) return false;
      return true;
    });

  let plain = paragraphs.join("\n\n");
  if (!plain) {
    const ogDesc =
      html.match(/property=["']og:description["']\s+content=["']([^"']+)["']/i)?.[1] ||
      html.match(/content=["']([^"']+)["']\s+property=["']og:description["']/i)?.[1] ||
      "";
    plain = stripTags(ogDesc);
  }

  const summaryAr = plain.slice(0, SUMMARY_SOFT_MAX).trim();
  const bodyAr = sanitizeBodyHtml(plainTextToBodyHtml(plain)) || "";
  const ogImage = og && !SKIP_IMG.test(og) ? unwrapSrc(absUrl(og)) : null;
  return { title, summaryAr, bodyAr, ogImage, pdfUrls, publishedAt };
}

const AR_MONTHS: Array<{ re: RegExp; abbr: string; num: number }> = [
  { re: /يناير|جانفي|يان/, abbr: "يان", num: 1 },
  { re: /فبراير|فيفري|فيف/, abbr: "فيف", num: 2 },
  { re: /مارس/, abbr: "مار", num: 3 },
  { re: /أبريل|ابريل|أفريل|افريل/, abbr: "أفر", num: 4 },
  { re: /مايو|ماي/, abbr: "ماي", num: 5 },
  { re: /يونيو|جوان|يون/, abbr: "يون", num: 6 },
  { re: /يوليو|جويلية|يول/, abbr: "يول", num: 7 },
  { re: /أغسطس|اوت|أوت|غشت/, abbr: "أغس", num: 8 },
  { re: /سبتمبر|شتنبر/, abbr: "ست", num: 9 },
  { re: /أكتوبر|اكتوبر/, abbr: "أكت", num: 10 },
  { re: /نوفمبر/, abbr: "نوف", num: 11 },
  { re: /ديسمبر/, abbr: "ديس", num: 12 },
];

export function parseEventDate(source: string | null | undefined): {
  day: string | null;
  month: string | null;
  year: string | null;
} {
  if (!source) return { day: null, month: null, year: null };
  const iso = source.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const monthNum = Number(iso[2]);
    const hit = AR_MONTHS.find((m) => m.num === monthNum);
    return { day: iso[3], month: hit?.abbr ?? iso[2], year: iso[1] };
  }
  const year = source.match(/(20\d{2}|19\d{2})/)?.[1] ?? null;
  const day = source.match(/\b(\d{1,2})\b/)?.[1]?.padStart(2, "0") ?? null;
  const month = AR_MONTHS.find((m) => m.re.test(source))?.abbr ?? null;
  return { day, month, year };
}

export function eventStatusFromYear(year: string | null): "upcoming" | "done" {
  if (!year) return "done";
  const y = Number(year);
  const now = new Date().getFullYear();
  return y > now ? "upcoming" : "done";
}

async function scrapeListingHub(hub: ListingHub): Promise<ScrapedItem[]> {
  const first = await fetchText(hub.url);
  await sleep(CRAWL_DELAY_MS);
  const lastPage = Math.min(maxPaged(first), 40);
  const pages = [first];
  for (let p = 2; p <= lastPage; p += 1) {
    pages.push(await fetchText(withPaged(hub.url, p)));
    await sleep(CRAWL_DELAY_MS);
  }

  const cards = pages.flatMap((html) => listingCardsFromHtml(html));
  const items: ScrapedItem[] = [];
  const seen = new Set<string>();
  for (const card of cards) {
    const key = card.href.replace(/#.*$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    const html = await fetchText(card.href);
    await sleep(CRAWL_DELAY_MS);
    const detail = extractDetail(html, card.title);
    const parsed = parseEventDate(detail.publishedAt || card.dateHint);
    items.push({
      type: hub.type,
      hubLabel: hub.label,
      hubUrl: hub.url,
      url: card.href,
      title: detail.title || card.title,
      summaryAr: detail.summaryAr,
      bodyAr: detail.bodyAr,
      imageUrl: detail.ogImage || card.img,
      pdfUrls: detail.pdfUrls,
      publishedAt: detail.publishedAt,
      eventScope: hub.eventScope,
      eventTypeAr: hub.eventTypeAr,
      eventDay: parsed.day,
      eventMonth: parsed.month,
      eventYear: parsed.year,
      partnerScope: hub.partnerScope,
      platformKind: hub.platformKind,
      orgUnitId: hub.orgUnitId,
      newsLabel: hub.newsLabel,
    });
  }
  return items;
}

function scrapedFromDetail(
  hub: ListingHub,
  url: string,
  title: string,
  detail: DetailExtract,
  listImg: string | null,
  dateHint: string | null,
  type: CmsType = hub.type,
): ScrapedItem {
  const parsed = parseEventDate(detail.publishedAt || dateHint);
  return {
    type,
    hubLabel: hub.label,
    hubUrl: hub.url,
    url,
    title: detail.title || title,
    summaryAr: detail.summaryAr,
    bodyAr: detail.bodyAr,
    imageUrl: detail.ogImage || listImg,
    pdfUrls: detail.pdfUrls,
    publishedAt: detail.publishedAt,
    eventScope: hub.eventScope,
    eventTypeAr: hub.eventTypeAr,
    eventDay: parsed.day,
    eventMonth: parsed.month,
    eventYear: parsed.year,
    partnerScope: hub.partnerScope,
    platformKind: hub.platformKind,
    orgUnitId: hub.orgUnitId,
    newsLabel: hub.newsLabel,
  };
}

async function scrapePageHub(hub: ListingHub): Promise<ScrapedItem[]> {
  const html = await fetchText(hub.url);
  await sleep(CRAWL_DELAY_MS);
  const detail = extractDetail(html, hub.label);
  const items = [scrapedFromDetail(hub, hub.url, hub.label, detail, detail.ogImage, detail.publishedAt)];

  if (hub.type === "research_group") {
    const cards = listingCardsFromHtml(html);
    const seen = new Set(items.map((i) => i.url));
    for (const card of cards) {
      if (seen.has(card.href)) continue;
      seen.add(card.href);
      const childHtml = await fetchText(card.href);
      await sleep(CRAWL_DELAY_MS);
      const child = extractDetail(childHtml, card.title);
      items.push(
        scrapedFromDetail(
          hub,
          card.href,
          card.title,
          child,
          card.img,
          card.dateHint,
          "research_project",
        ),
      );
    }
  }
  return items;
}

export async function scrapeAllHubs(
  onProgress?: (msg: string) => void,
): Promise<ScrapedItem[]> {
  const out: ScrapedItem[] = [];
  for (const hub of LISTING_HUBS) {
    onProgress?.(`Hub ${hub.type} — ${hub.label}`);
    if (hub.kind === "listing") {
      const items = await scrapeListingHub(hub);
      onProgress?.(`  ${items.length} posts`);
      out.push(...items);
    } else {
      const items = await scrapePageHub(hub);
      onProgress?.(`  ${items.length} page item(s)`);
      out.push(...items);
    }
  }
  return out;
}

/** WP has no dedicated book listing; search existing CMS titles to recover covers/bodies. */
export async function scrapePublicationSearches(
  titles: string[],
  onProgress?: (msg: string) => void,
): Promise<ScrapedItem[]> {
  const hub: ListingHub = {
    kind: "listing",
    type: "publication",
    url: `${WP_ORIGIN}/?s=`,
    label: "بحث الإصدارات",
  };
  const out: ScrapedItem[] = [];
  const seen = new Set<string>();
  for (const title of titles) {
    const q = title.trim();
    if (q.length < 8) continue;
    onProgress?.(`Search publication: ${q.slice(0, 48)}`);
    let html: string;
    try {
      html = await fetchText(`${WP_ORIGIN}/?s=${encodeURIComponent(q)}`);
    } catch {
      onProgress?.("  search failed");
      continue;
    }
    await sleep(CRAWL_DELAY_MS);
    const cards = listingCardsFromHtml(html);
    const card = cards[0];
    if (!card || seen.has(card.href)) {
      onProgress?.("  no hit");
      continue;
    }
    seen.add(card.href);
    try {
      const detailHtml = await fetchText(card.href);
      await sleep(CRAWL_DELAY_MS);
      const detail = extractDetail(detailHtml, card.title);
      if (!titlesMatch(q, card.title) && !titlesMatch(q, detail.title)) {
        onProgress?.("  hit title mismatch — skip");
        continue;
      }
      out.push(scrapedFromDetail(hub, card.href, card.title, detail, card.img, card.dateHint, "publication"));
      onProgress?.(`  hit ${card.title.slice(0, 48)}`);
    } catch {
      onProgress?.("  detail failed");
    }
  }
  return out;
}

export type CmsRow = {
  id: string;
  content_type: CmsType;
  title_ar: string;
  public_slug: string | null;
  org_unit_id: string | null;
  image_path: string | null;
  pub_kind: string | null;
  label_ar: string | null;
  partner_emoji: string | null;
  partner_scope: string | null;
  live_at: Date | null;
  published_at: Date | null;
};

export function matchCmsRow(rows: CmsRow[], item: ScrapedItem): CmsRow | null {
  const sameType = rows.filter((r) => r.content_type === item.type);
  if (item.type === "partner") {
    const hit = matchPartnerRow(sameType, item);
    if (hit) return hit;
  }
  if (item.type === "research_group") {
    const hit = matchResearchGroup(sameType, item);
    if (hit) return hit;
  }
  if (item.type === "platform") {
    const hit = matchPlatformRow(sameType, item);
    if (hit) return hit;
  }
  for (const row of sameType) {
    if (titlesMatch(row.title_ar, item.title)) return row;
    if (row.public_slug && row.public_slug === slugifyTitle(item.title)) return row;
  }
  return null;
}

const PARTNER_RULES: Array<{ scope: "intl" | "nat"; keywords: string[]; nameIncludes: string }> = [
  { scope: "intl", keywords: ["بوسان", "كوريا"], nameIncludes: "بوسان" },
  { scope: "intl", keywords: ["الترمذي", "ترمذ", "أوزبك"], nameIncludes: "الترمذي" },
  { scope: "intl", keywords: ["نيجر", "نيجري"], nameIncludes: "النيجيري" },
  { scope: "nat", keywords: ["الوكالة الموضوعاتية", "قسنطينة"], nameIncludes: "الوكالة الموضوعاتية" },
  { scope: "nat", keywords: ["معهد الآثار", "الجزائر 02", "الجزائر 2"], nameIncludes: "الآثار" },
  { scope: "nat", keywords: ["السلام", "مصرف"], nameIncludes: "السلام" },
  { scope: "nat", keywords: ["المجلس الإسلامي الأعلى"], nameIncludes: "المجلس الإسلامي" },
  { scope: "nat", keywords: ["السياحة", "الصناعة التقليدية"], nameIncludes: "السياحة" },
  { scope: "nat", keywords: ["الشؤون الدينية", "الأوقاف"], nameIncludes: "الشؤون الدينية" },
  { scope: "nat", keywords: ["CRASC", "الأنثروبولوجيا"], nameIncludes: "الأنثروبولوجيا" },
  { scope: "nat", keywords: ["متعددة الأطراف", "جامعات وطنية"], nameIncludes: "جامعات" },
];

function matchPartnerRow(rows: CmsRow[], item: ScrapedItem): CmsRow | null {
  const scope = item.partnerScope;
  for (const rule of PARTNER_RULES) {
    if (scope && rule.scope !== scope) continue;
    if (!rule.keywords.some((k) => item.title.includes(k))) continue;
    const partner = rows.find(
      (p) =>
        (!scope || p.partner_scope === scope || !p.partner_scope) &&
        p.title_ar.includes(rule.nameIncludes),
    );
    if (partner) return partner;
  }
  return null;
}

const GROUP_HINTS: Array<{ orgUnitId: string; needles: string[] }> = [
  { orgUnitId: "dept_quran_fiqh", needles: ["اعجاز", "إعجاز"] },
  { orgUnitId: "dept_quran_fiqh", needles: ["فقهي"] },
  { orgUnitId: "dept_thought_dialogue", needles: ["حوار الحضارات", "حوار"] },
  { orgUnitId: "dept_thought_dialogue", needles: ["عقائد", "مذاهب"] },
  { orgUnitId: "dept_algeria_history", needles: ["تراث", "قصور"] },
  { orgUnitId: "dept_algeria_history", needles: ["أعلام"] },
  { orgUnitId: "dept_islamic_civ", needles: ["الحضارة الإسلامية", "مجتمع"] },
  { orgUnitId: "dept_islamic_civ", needles: ["اقتصاد"] },
];

function matchResearchGroup(rows: CmsRow[], item: ScrapedItem): CmsRow | null {
  const pool = rows.filter((r) => !item.orgUnitId || r.org_unit_id === item.orgUnitId);
  for (const row of pool) {
    if (titlesMatch(row.title_ar, item.title)) return row;
  }
  const hint = GROUP_HINTS.find(
    (h) =>
      (!item.orgUnitId || h.orgUnitId === item.orgUnitId) &&
      h.needles.some((n) => item.title.includes(n) || item.hubLabel.includes(n)),
  );
  if (!hint) return null;
  return (
    pool.find((r) => hint.needles.some((n) => r.title_ar.includes(n))) ?? null
  );
}

function matchPlatformRow(rows: CmsRow[], item: ScrapedItem): CmsRow | null {
  if (item.platformKind) {
    const byKind = rows.find((r) => titlesMatch(r.title_ar, item.title));
    if (byKind) return byKind;
    const kindNeedle: Record<string, string[]> = {
      visual: ["مرئي"],
      radio: ["إذاعي", "الحصة"],
      mobility: ["تنقل", "حركية", "قصير"],
    };
    const needles = kindNeedle[item.platformKind] ?? [];
    return rows.find((r) => needles.some((n) => r.title_ar.includes(n))) ?? null;
  }
  return null;
}
