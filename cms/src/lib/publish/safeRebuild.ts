import { query } from "@/lib/db";

type LiveState = {
  status: string;
  live_payload: unknown;
  live_at: Date | null;
  public_slug: string | null;
  published_at: Date | null;
};

/** Capture live publish columns so a failed JSON rebuild can roll the DB row back. */
export async function captureLiveState(itemId: string): Promise<LiveState> {
  const result = await query<LiveState>(
    `SELECT status, live_payload, live_at, public_slug, published_at
     FROM content_items WHERE id = $1`,
    [itemId],
  );
  const row = result.rows[0];
  if (!row) throw new Error("Not found");
  return row;
}

export async function restoreLiveState(itemId: string, state: LiveState): Promise<void> {
  await query(
    `UPDATE content_items SET
       status = $2,
       live_payload = $3::jsonb,
       live_at = $4,
       public_slug = $5,
       published_at = $6,
       updated_at = NOW()
     WHERE id = $1`,
    [
      itemId,
      state.status,
      state.live_payload == null ? null : JSON.stringify(state.live_payload),
      state.live_at,
      state.public_slug,
      state.published_at,
    ],
  );
}

/**
 * Run a DB publish/unpublish mutation, then rebuild public JSON.
 * If rebuild fails, restore the previous live columns so DB and public files stay aligned.
 */
export async function mutateThenRebuildPublic<T>(opts: {
  itemId: string;
  mutate: () => Promise<T>;
  rebuild: () => Promise<unknown>;
}): Promise<T> {
  const before = await captureLiveState(opts.itemId);
  const item = await opts.mutate();
  try {
    await opts.rebuild();
    return item;
  } catch (err) {
    await restoreLiveState(opts.itemId, before);
    throw err;
  }
}
