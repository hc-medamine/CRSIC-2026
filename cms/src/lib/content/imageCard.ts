import { query } from "@/lib/db";

export async function persistImageCardPath(
  itemId: string,
  imageCardPath: string | null | undefined,
): Promise<void> {
  if (imageCardPath === undefined) return;
  const v = imageCardPath?.trim() || null;
  if (v && !v.startsWith("img/")) {
    throw new Error("Invalid card image path");
  }
  await query(`UPDATE content_items SET image_card_path = $2 WHERE id = $1`, [itemId, v]);
}
