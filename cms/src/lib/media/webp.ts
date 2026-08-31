import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import sharp from "sharp";

/** Skip tiny stub files (PRD should-have). */
export const WEBP_MIN_BYTES = 70;

function publicRepoRoot(): string {
  return join(process.cwd(), "..");
}

export function absolutePublicPath(publicPath: string): string {
  return join(publicRepoRoot(), ...publicPath.split("/"));
}

/** Derive sibling WebP path from a JPEG/PNG public path; null when not applicable. */
export function webpPublicPath(src: string): string | null {
  const trimmed = src.trim();
  if (!trimmed || /\.webp$/i.test(trimmed)) return null;
  if (!/\.(jpe?g|png)$/i.test(trimmed)) return null;
  return trimmed.replace(/\.(jpe?g|png)$/i, ".webp");
}

/** Return WebP sibling path when the file exists on disk. */
export function webpPathIfExists(publicPath: string | null | undefined): string | undefined {
  if (!publicPath?.trim()) return undefined;
  const wp = webpPublicPath(publicPath);
  if (!wp) return undefined;
  return existsSync(absolutePublicPath(wp)) ? wp : undefined;
}

/**
 * Write a WebP sibling next to a JPEG/PNG under the public repo.
 * Returns the public WebP path, or null when skipped or failed.
 */
export async function writeWebpSibling(publicPath: string): Promise<string | null> {
  const trimmed = publicPath.trim();
  const wp = webpPublicPath(trimmed);
  if (!wp) return null;

  const srcAbs = absolutePublicPath(trimmed);
  if (!existsSync(srcAbs)) return null;

  let size = 0;
  try {
    size = statSync(srcAbs).size;
  } catch {
    return null;
  }
  if (size < WEBP_MIN_BYTES) return null;

  const destAbs = absolutePublicPath(wp);
  try {
    const input = readFileSync(srcAbs);
    const out = await sharp(input).webp({ quality: 82 }).toBuffer();
    mkdirSync(dirname(destAbs), { recursive: true });
    writeFileSync(destAbs, out);
    return wp;
  } catch {
    return null;
  }
}
