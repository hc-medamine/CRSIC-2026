import { writeWebpSibling } from "@/lib/media/webp";
import { ensureCardForContentRow, type CardSourceRow } from "@/lib/media/cardVariant";

export type ContentImageRow = CardSourceRow & {
  og_image?: string | null;
  portrait_path?: string | null;
  attachments?: unknown;
};

function attachmentSrc(entry: unknown): string | null {
  if (!entry || typeof entry !== "object") return null;
  const o = entry as Record<string, unknown>;
  const src = typeof o.src === "string" ? o.src : typeof o.path === "string" ? o.path : "";
  return src.trim() || null;
}

/** Collect distinct image paths from a content row (master, card, OG, attachments, portrait). */
export function collectContentImagePaths(row: ContentImageRow): string[] {
  const paths = new Set<string>();
  for (const p of [row.image_path, row.image_card_path, row.og_image, row.portrait_path]) {
    if (p?.trim()) paths.add(p.trim());
  }
  if (Array.isArray(row.attachments)) {
    for (const entry of row.attachments) {
      const src = attachmentSrc(entry);
      if (src) paths.add(src);
    }
  }
  return [...paths];
}

/** Generate WebP siblings for every image path on a content row (publish / rebuild). */
export async function ensureWebpForContentRow(row: ContentImageRow): Promise<void> {
  for (const p of collectContentImagePaths(row)) {
    await writeWebpSibling(p);
  }
}

/**
 * Before public JSON: auto card from master when missing, then WebP siblings.
 * Returns the row with image_card_path set when a card was generated.
 */
export async function prepareContentImagesForPublish(
  row: ContentImageRow,
): Promise<ContentImageRow> {
  const image_card_path = await ensureCardForContentRow(row);
  const enriched: ContentImageRow = { ...row, image_card_path: image_card_path ?? row.image_card_path };
  await ensureWebpForContentRow(enriched);
  return enriched;
}
