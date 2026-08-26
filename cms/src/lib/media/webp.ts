import { existsSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

/** Skip encode for empty/stub files (PRD Should: e.g. 70-byte placeholders). */
export const MIN_WEBP_SOURCE_BYTES = 70;

const WEBP_QUALITY = 80;
const MASTER_EXT = /\.(jpe?g|png)$/i;

export type WebpFields = {
  img_webp?: string;
  img_card_webp?: string;
  portrait_webp?: string;
};

function defaultRoot(): string {
  return join(process.cwd(), "..");
}

export function isAllowedPublicImagePath(publicPath: string): boolean {
  const p = publicPath.trim().replace(/\\/g, "/");
  if (!p || p.includes("..") || p.startsWith("/") || p.includes("\0")) return false;
  return p.startsWith("img/cms/") || p.startsWith("img/covers/");
}

/** `img/cms/news/a.jpg` → `img/cms/news/a.webp`. Null if not a JPEG/PNG master. */
export function webpSiblingPublicPath(publicPath: string): string | null {
  const p = publicPath.trim().replace(/\\/g, "/");
  if (!isAllowedPublicImagePath(p) || !MASTER_EXT.test(p)) return null;
  return p.replace(MASTER_EXT, ".webp");
}

export function absolutePublicMediaPath(publicPath: string, root = defaultRoot()): string {
  return join(root, ...publicPath.split("/"));
}

/**
 * Write a WebP sibling next to a JPEG/PNG public file.
 * Skip: missing file, already WebP (returns same path), too small, not an allowed path.
 */
export async function ensureWebpSibling(
  publicPath: string | null | undefined,
  opts?: { root?: string },
): Promise<string | null> {
  const p = publicPath?.trim().replace(/\\/g, "/") || "";
  if (!p || !isAllowedPublicImagePath(p)) return null;

  const root = opts?.root ?? defaultRoot();
  const abs = absolutePublicMediaPath(p, root);
  if (!existsSync(abs)) return null;

  const lower = p.toLowerCase();
  if (lower.endsWith(".webp")) return p;
  if (!MASTER_EXT.test(p)) return null;

  let size = 0;
  try {
    size = statSync(abs).size;
  } catch {
    return null;
  }
  if (size < MIN_WEBP_SOURCE_BYTES) return null;

  const destPublic = webpSiblingPublicPath(p);
  if (!destPublic) return null;
  const destAbs = absolutePublicMediaPath(destPublic, root);

  try {
    if (existsSync(destAbs) && statSync(destAbs).mtimeMs >= statSync(abs).mtimeMs) {
      return destPublic;
    }
  } catch {
    /* encode */
  }

  try {
    await sharp(abs).webp({ quality: WEBP_QUALITY }).toFile(destAbs);
  } catch {
    return null;
  }
  return destPublic;
}

/** Best-effort delete of the `.webp` sibling when a JPEG/PNG master is removed. */
export function unlinkWebpSibling(publicPath: string, root = defaultRoot()): void {
  const dest = webpSiblingPublicPath(publicPath);
  if (!dest) return;
  try {
    const abs = absolutePublicMediaPath(dest, root);
    if (existsSync(abs)) unlinkSync(abs);
  } catch {
    /* best-effort */
  }
}

type ImgLike = {
  img?: string | null;
  img_card?: string | null;
  cover?: string | null;
  portrait?: string | null;
  img_webp?: string;
  img_card_webp?: string;
  portrait_webp?: string;
};

/** Attach optional WebP JSON keys; writes siblings on disk when the master exists. */
export async function attachWebpSiblings<T extends ImgLike>(
  item: T,
  opts?: { root?: string },
): Promise<T & WebpFields> {
  const master = item.img?.trim() || item.cover?.trim() || item.portrait?.trim() || "";
  const card = item.img_card?.trim() || "";
  const imgWebp = await ensureWebpSibling(master, opts);
  const cardWebp = card ? await ensureWebpSibling(card, opts) : null;
  const next: T & WebpFields = { ...item };
  if (imgWebp) {
    if (item.img?.trim() || item.cover?.trim()) next.img_webp = imgWebp;
    if (item.portrait?.trim() && item.portrait.trim() === master) {
      next.portrait_webp = imgWebp;
    }
  }
  if (cardWebp) next.img_card_webp = cardWebp;
  return next;
}
