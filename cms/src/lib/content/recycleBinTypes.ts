import type { ContentType } from "@/lib/content-types";

export type RecycleBinClientRow = {
  id: string;
  contentType: ContentType;
  titleAr: string;
  recycledFromStatus: string;
  recycledAt: string;
};
