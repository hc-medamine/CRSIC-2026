import { query } from "@/lib/db";
import { slugifyTitle, uniqueSlug } from "@/lib/publish/slug";

/** Resolve a public slug for publish: prefer existing/override, else title; unique per content_items. */
export async function resolvePublicSlug(opts: {
  itemId: string;
  titleAr: string;
  existingSlug: string | null | undefined;
  overrideSlug?: string | null;
}): Promise<string> {
  const preferred =
    opts.overrideSlug?.trim() ||
    opts.existingSlug?.trim() ||
    slugifyTitle(opts.titleAr);

  const result = await query<{ public_slug: string }>(
    `SELECT public_slug FROM content_items
     WHERE public_slug IS NOT NULL AND id <> $1`,
    [opts.itemId],
  );
  const used = new Set(result.rows.map((r) => r.public_slug));
  return uniqueSlug(preferred, used);
}
