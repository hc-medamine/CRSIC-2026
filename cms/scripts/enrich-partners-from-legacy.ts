/**
 * Scrape legacy WP partner posts → dry-run map → optionally enrich CMS + republish.
 *
 * Usage (from cms/):
 *   npm run db:enrich:partners           # dry-run (default)
 *   npm run db:enrich:partners -- --apply
 *
 * Does NOT overwrite curated title_ar / label_ar / partner_emoji.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { query, pool } from "../src/lib/db";
import { sanitizeBodyHtml, plainTextToBodyHtml } from "../src/lib/content/sanitizeBody";
import { publicPathFor } from "../src/lib/media/config";
import {
  buildPartnerPayload,
  rebuildPublicPartnersJson,
} from "../src/lib/publish/partnersJson";

const NAT_URL = "https://www.crsic.dz/?page_id=2278";
const INTL_URL = "https://www.crsic.dz/?page_id=2282";
const SUMMARY_SOFT_MAX = 200;

type Scope = "nat" | "intl";

type ScrapedPost = {
  scope: Scope;
  title: string;
  href: string;
  listImg: string | null;
  dateHint: string | null;
  summaryAr: string;
  bodyAr: string;
  ogImage: string | null;
};

type DbPartner = {
  id: string;
  title_ar: string;
  label_ar: string | null;
  partner_scope: Scope | null;
  partner_date: string | null;
  partner_emoji: string | null;
  image_path: string | null;
  public_slug: string | null;
  summary_ar: string | null;
  body_ar: string | null;
  og_image: string | null;
  meta_title_ar: string | null;
  meta_title_en: string | null;
  meta_description_ar: string | null;
  meta_description_en: string | null;
};

/** Keyword → curated partner title fragment (matched against scraped WP title). */
const MATCH_RULES: Array<{ scope: Scope; keywords: string[]; nameIncludes: string }> = [
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

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "CRSIC-CMS-partner-enrich/1.0" },
  });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} ${url}`);
  return res.text();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " "));
}

function listPosts(html: string, scope: Scope): Array<{ title: string; href: string; img: string | null; dateHint: string | null }> {
  const blocks = html.split(/wp-show-posts-inner/);
  const out: Array<{ title: string; href: string; img: string | null; dateHint: string | null }> = [];
  for (const block of blocks.slice(1)) {
    const titleMatch = block.match(
      /<h2[^>]*>\s*<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>\s*<\/h2>/i,
    );
    if (!titleMatch) continue;
    const href = titleMatch[1];
    const title = stripTags(titleMatch[2]);
    if (!href.includes("?p=") && !href.includes("/20")) continue;
    const imgMatch = block.match(/<img[^>]+src=["']([^"']+)["']/i);
    const dateMatch = block.match(/(يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر)[^<]{0,40}\d{4}/);
    out.push({
      title,
      href: href.startsWith("http") ? href : `https://www.crsic.dz/${href.replace(/^\//, "")}`,
      img: imgMatch?.[1]?.replace(/-300x\d+\./, ".") ?? null,
      dateHint: dateMatch?.[0] ?? null,
    });
  }
  return out;
}

function extractDetail(html: string): { summaryAr: string; bodyAr: string; ogImage: string | null } {
  const og =
    html.match(/property=["']og:image["']\s+content=["']([^"']+)["']/i)?.[1] ||
    html.match(/content=["']([^"']+)["']\s+property=["']og:image["']/i)?.[1] ||
    null;

  // Scope to article / entry when possible (PageLayer nests many empty divs).
  const scope =
    html.match(/<article\b[\s\S]*?<\/article>/i)?.[0] ||
    html.match(
      /<div[^>]+class=["'][^"']*entry-content[^"']*["'][^>]*>[\s\S]*$/i,
    )?.[0] ||
    html;

  const cleaned = scope
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");

  // Collect <p> from the full article scope first (PageLayer nests empty divs
  // inside text-holders; a non-greedy holder regex would stop before the <p>).
  const paragraphs = [...cleaned.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => stripTags(m[1]))
    .filter((p) => {
      if (p.length < 40) return false;
      if (/اترك تعليقا|Leave a Reply|Share on|احفظ اسمي/i.test(p)) return false;
      return true;
    });

  let plain = paragraphs.join("\n\n");
  if (!plain) {
    const ogDesc =
      html.match(/property=["']og:description["']\s+content=["']([^"']+)["']/i)?.[1] ||
      html.match(/content=["']([^"']+)["']\s+property=["']og:description["']/i)?.[1] ||
      "";
    plain = stripTags(ogDesc);
    if (plain === "\u00a0" || plain === "&nbsp;") plain = "";
  }

  const summaryAr = plain.slice(0, SUMMARY_SOFT_MAX).trim();
  const bodyAr = sanitizeBodyHtml(plainTextToBodyHtml(plain)) || "";
  return { summaryAr, bodyAr, ogImage: og };
}

async function scrapeScope(scope: Scope, url: string): Promise<ScrapedPost[]> {
  const listHtml = await fetchHtml(url);
  const cards = listPosts(listHtml, scope);
  const posts: ScrapedPost[] = [];
  for (const card of cards) {
    const detailHtml = await fetchHtml(card.href);
    const detail = extractDetail(detailHtml);
    posts.push({
      scope,
      title: card.title,
      href: card.href,
      listImg: card.img,
      dateHint: card.dateHint,
      summaryAr: detail.summaryAr,
      bodyAr: detail.bodyAr,
      ogImage: detail.ogImage || card.img,
    });
  }
  return posts;
}

function findPartner(partners: DbPartner[], post: ScrapedPost): DbPartner | null {
  const rules = MATCH_RULES.filter((r) => r.scope === post.scope);
  for (const rule of rules) {
    const hit = rule.keywords.some((k) => post.title.includes(k));
    if (!hit) continue;
    const partner = partners.find(
      (p) =>
        (p.partner_scope === post.scope || !p.partner_scope) &&
        p.title_ar.includes(rule.nameIncludes),
    );
    if (partner) return partner;
  }
  return null;
}

async function downloadToPartnersBucket(
  imageUrl: string,
  uploadedBy: string,
): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, {
      headers: { "User-Agent": "CRSIC-CMS-partner-enrich/1.0" },
    });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const ct = res.headers.get("content-type") || "";
    let extension = "jpg";
    if (ct.includes("png") || imageUrl.toLowerCase().endsWith(".png")) extension = "png";
    else if (ct.includes("webp") || imageUrl.toLowerCase().endsWith(".webp")) extension = "webp";
    else if (ct.includes("jpeg") || ct.includes("jpg")) extension = "jpg";

    const inserted = await query<{ id: string }>(
      `INSERT INTO media_assets (
         bucket, original_filename, mime_type, byte_size, extension, public_path, uploaded_by
       ) VALUES (
         'partners', $1, $2, $3, $4, 'pending', $5
       ) RETURNING id`,
      [
        imageUrl.split("/").pop()?.slice(0, 180) || `legacy.${extension}`,
        ct.startsWith("image/") ? ct : `image/${extension === "jpg" ? "jpeg" : extension}`,
        buffer.byteLength,
        extension,
        uploadedBy,
      ],
    );
    const id = inserted.rows[0]?.id;
    if (!id) return null;
    const publicPath = publicPathFor("partners", id, extension);
    await query(`UPDATE media_assets SET public_path = $2 WHERE id = $1`, [id, publicPath]);

    const staging = join(process.cwd(), "uploads", `${id}.${extension}`);
    const publicAbs = join(process.cwd(), "..", ...publicPath.split("/"));
    mkdirSync(dirname(staging), { recursive: true });
    mkdirSync(dirname(publicAbs), { recursive: true });
    writeFileSync(staging, buffer);
    writeFileSync(publicAbs, buffer);
    return publicPath;
  } catch (err) {
    console.warn(`Image download failed: ${imageUrl}`, err);
    return null;
  }
}

async function main() {
  const apply = process.argv.includes("--apply");
  console.log(apply ? "Mode: APPLY" : "Mode: DRY-RUN (pass --apply to write)");

  const [natPosts, intlPosts] = await Promise.all([
    scrapeScope("nat", NAT_URL),
    scrapeScope("intl", INTL_URL),
  ]);
  const scraped = [...natPosts, ...intlPosts];
  console.log(`Scraped ${scraped.length} posts (nat=${natPosts.length}, intl=${intlPosts.length})`);

  const partnersRes = await query<DbPartner>(
    `SELECT id, title_ar, label_ar, partner_scope, partner_date, partner_emoji,
            image_path, public_slug, summary_ar, body_ar, og_image,
            meta_title_ar, meta_title_en, meta_description_ar, meta_description_en
     FROM content_items
     WHERE content_type = 'partner' AND status = 'published'
     ORDER BY partner_scope, title_ar`,
  );
  const partners = partnersRes.rows.map((p) => ({
    ...p,
    partner_scope: (p.partner_scope === "intl" ? "intl" : "nat") as Scope,
  }));

  const sa = await query<{ id: string }>(
    `SELECT id FROM users WHERE role = 'super_admin' AND is_active = TRUE ORDER BY created_at ASC LIMIT 1`,
  );
  const uploadedBy = sa.rows[0]?.id;
  if (!uploadedBy) throw new Error("No super admin for media uploads");

  const mappings: Array<Record<string, unknown>> = [];
  const unmatchedPosts: ScrapedPost[] = [];
  const unmatchedPartners = new Set(partners.map((p) => p.id));

  for (const post of scraped) {
    const partner = findPartner(partners, post);
    if (!partner) {
      unmatchedPosts.push(post);
      continue;
    }
    unmatchedPartners.delete(partner.id);
    mappings.push({
      partnerId: partner.id,
      partnerName: partner.title_ar,
      scope: post.scope,
      legacyTitle: post.title,
      legacyUrl: post.href,
      summaryLen: post.summaryAr.length,
      bodyLen: post.bodyAr.length,
      imageUrl: post.ogImage,
      alreadyHasSummary: Boolean(partner.summary_ar?.trim()),
      alreadyHasBody: Boolean(partner.body_ar?.trim()),
      alreadyHasImage: Boolean(partner.image_path?.trim()),
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    scraped: scraped.length,
    mapped: mappings.length,
    unmatchedPosts: unmatchedPosts.map((p) => ({ scope: p.scope, title: p.title, href: p.href })),
    unmatchedPartners: partners
      .filter((p) => unmatchedPartners.has(p.id))
      .map((p) => ({ id: p.id, title_ar: p.title_ar, scope: p.partner_scope })),
    mappings,
  };

  const outDir = join(process.cwd(), "tmp");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const reportPath = join(outDir, `partners-enrich-${Date.now()}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`Report: ${reportPath}`);
  console.log(
    JSON.stringify(
      {
        scraped: report.scraped,
        mapped: report.mapped,
        unmatchedPosts: report.unmatchedPosts.length,
        unmatchedPartners: report.unmatchedPartners.length,
      },
      null,
      2,
    ),
  );

  if (!apply) {
    console.log("Dry-run complete. Re-run with --apply after reviewing the report.");
    await pool.end();
    return;
  }

  let updated = 0;
  for (const post of scraped) {
    const partner = findPartner(partners, post);
    if (!partner) continue;

    let imagePath = partner.image_path;
    if (!imagePath?.trim() && post.ogImage) {
      imagePath = (await downloadToPartnersBucket(post.ogImage, uploadedBy)) || partner.image_path;
    }

    // Prefer fresh scrape when non-empty (fills PageLayer posts missed earlier).
    const summaryAr = post.summaryAr.trim() || partner.summary_ar?.trim() || null;
    const bodyAr = post.bodyAr.trim() || partner.body_ar?.trim() || null;
    const ogImage = partner.og_image?.trim() || imagePath || null;

    const payload = buildPartnerPayload({
      id: partner.id,
      title_ar: partner.title_ar,
      label_ar: partner.label_ar,
      partner_date: partner.partner_date,
      partner_emoji: partner.partner_emoji,
      partner_scope: partner.partner_scope,
      public_slug: partner.public_slug,
      image_path: imagePath,
      summary_ar: summaryAr,
      summary_en: null,
      body_ar: bodyAr,
      body_en: null,
      og_image: ogImage,
      meta_title_ar: partner.meta_title_ar,
      meta_title_en: partner.meta_title_en,
      meta_description_ar: partner.meta_description_ar,
      meta_description_en: partner.meta_description_en,
    });

    await query(
      `UPDATE content_items SET
         summary_ar = $2,
         body_ar = $3,
         image_path = $4,
         og_image = $5,
         live_payload = $6::jsonb,
         live_at = NOW(),
         updated_at = NOW()
       WHERE id = $1 AND content_type = 'partner'`,
      [
        partner.id,
        summaryAr,
        bodyAr,
        imagePath,
        ogImage,
        JSON.stringify(payload),
      ],
    );
    updated += 1;
    console.log(`Updated ${partner.title_ar}`);
  }

  const rebuild = await rebuildPublicPartnersJson();
  console.log(`Updated ${updated} partners. Rebuilt ${rebuild.path} (intl=${rebuild.intl}, nat=${rebuild.nat})`);
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
