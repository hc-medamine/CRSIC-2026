import { mutateThenRebuildPublic } from "@/lib/publish/safeRebuild";

export type SilentUnpublishOpts = {
  /** Default true. Bulk sets false, then rebuilds public JSON once. */
  rebuild?: boolean;
  /** Default true. Bulk sets false (no N in-CMS pings). */
  notify?: boolean;
};

export function shouldNotifyUnpublish(opts: SilentUnpublishOpts = {}): boolean {
  return opts.notify !== false;
}

export async function unpublishMutateMaybeRebuild<T>(
  itemId: string,
  mutate: () => Promise<T>,
  rebuild: () => Promise<unknown>,
  opts: SilentUnpublishOpts = {},
): Promise<T> {
  if (opts.rebuild === false) return mutate();
  return mutateThenRebuildPublic({ itemId, mutate, rebuild });
}
