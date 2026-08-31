import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import sharp from "sharp";
import { query } from "@/lib/db";
import { absolutePublicPath } from "@/lib/media/webp";

export const CARD_WIDTH = 800;

/** Derive a stable card sibling path from a master public path. */
export function cardPublicPathForMaster(masterPath: string): string {
  const trimmed = masterPath.trim();
  if (/-card\.jpe?g$/i.test(trimmed)) return trimmed;
  return `${trimmed.replace(/\.(jpe?g|png|webp)$/i, "")}-card.jpg`;
}

/** Center-crop master to 16:9 and write a JPEG card variant. Returns public path or null. */
export async function writeCardVariant(masterPublicPath: string): Promise<string | null> {
  const trimmed = masterPublicPath.trim();
  if (!trimmed || !/\.(jpe?g|png|webp)$/i.test(trimmed)) return null;

  const srcAbs = absolutePublicPath(trimmed);
  if (!existsSync(srcAbs)) return null;

  const destPublic = cardPublicPathForMaster(trimmed);
  const destAbs = absolutePublicPath(destPublic);

  try {
    const meta = await sharp(srcAbs).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    if (w < 1 || h < 1) return null;

    const targetRatio = 16 / 9;
    const srcRatio = w / h;
    let left = 0;
    let top = 0;
    let cropW = w;
    let cropH = h;
    if (srcRatio > targetRatio) {
      cropW = Math.round(h * targetRatio);
      left = Math.round((w - cropW) / 2);
    } else {
      cropH = Math.round(w / targetRatio);
      top = Math.round((h - cropH) / 2);
    }

    const outWidth = Math.min(CARD_WIDTH, cropW);
    const outHeight = Math.max(1, Math.round(outWidth / targetRatio));

    const buf = await sharp(srcAbs)
      .extract({ left, top, width: cropW, height: cropH })
      .resize(outWidth, outHeight, { fit: "fill" })
      .jpeg({ quality: 88 })
      .toBuffer();

    mkdirSync(dirname(destAbs), { recursive: true });
    writeFileSync(destAbs, buf);
    return destPublic;
  } catch {
    return null;
  }
}

export type CardSourceRow = {
  id?: string;
  image_path?: string | null;
  image_card_path?: string | null;
};

/** Ensure a card variant exists for the master; persist to content_items when id is set. */
export async function ensureCardForContentRow(row: CardSourceRow): Promise<string | null> {
  const master = row.image_path?.trim();
  if (!master) return row.image_card_path?.trim() || null;

  const existing = row.image_card_path?.trim();
  if (existing && existsSync(absolutePublicPath(existing))) return existing;

  const generated = await writeCardVariant(master);
  if (!generated) return existing || null;

  if (row.id) {
    await query(`UPDATE content_items SET image_card_path = $2 WHERE id = $1`, [row.id, generated]);
  }
  return generated;
}
