/** Shared public JSON extras: EN-when-ready + card image. */

export type StoryEnFields = {
  en_status: "pending" | "ready";
  title_en?: string;
  summary_en?: string;
  body_en?: string;
  label_en?: string;
  name_en?: string;
};

export type StoryEnSource = {
  en_status?: string | null;
  title_en?: string | null;
  summary_en?: string | null;
  body_en?: string | null;
  label_en?: string | null;
  name_en?: string | null;
};

export function publicEnStatus(value: string | null | undefined): "pending" | "ready" {
  return value === "ready" ? "ready" : "pending";
}

export function withStoryEn<T extends object>(
  item: T,
  row: StoryEnSource,
  opts?: { nameEn?: boolean },
): T & StoryEnFields {
  const en_status = publicEnStatus(row.en_status);
  const extra: StoryEnFields = { en_status };
  const titleEn = row.title_en?.trim() || row.name_en?.trim();
  const summaryEn = row.summary_en?.trim();
  const bodyEn = row.body_en?.trim();
  const labelEn = row.label_en?.trim();
  if (titleEn) {
    extra.title_en = titleEn;
    if (opts?.nameEn) extra.name_en = titleEn;
  }
  if (summaryEn) extra.summary_en = summaryEn;
  if (bodyEn) extra.body_en = bodyEn;
  if (labelEn) extra.label_en = labelEn;
  return { ...item, ...extra };
}

export function withImgCard<T extends object>(
  item: T,
  imageCardPath: string | null | undefined,
): T & { img_card?: string } {
  const v = imageCardPath?.trim();
  if (!v) return item;
  return { ...item, img_card: v };
}

/** Attach EN-when-ready fields + optional card image for live_payload / public JSON. */
export function withPublicStoryFields<T extends object>(
  item: T,
  row: StoryEnSource & { image_card_path?: string | null; img_card?: string | null },
  opts?: { nameEn?: boolean; typeEn?: string | null },
): T & StoryEnFields & { img_card?: string; type_en?: string } {
  let next: T & StoryEnFields & { img_card?: string; type_en?: string } = withStoryEn(
    item,
    row,
    opts,
  );
  const typeEn = opts?.typeEn?.trim();
  if (typeEn) next = { ...next, type_en: typeEn };
  return withImgCard(next, row.image_card_path ?? row.img_card);
}
