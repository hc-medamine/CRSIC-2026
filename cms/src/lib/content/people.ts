import { query } from "@/lib/db";

export type PersonRef = {
  id: string;
  displayName: string;
  email: string;
  role: string;
};

export type ItemPeopleMeta = {
  editor: PersonRef | null;
  reviewer: PersonRef | null;
  publisher: PersonRef | null;
  reviewOwner: PersonRef | null;
};

type UserRow = {
  id: string;
  display_name: string;
  email: string;
  role: string;
};

function toPerson(row: UserRow | null | undefined): PersonRef | null {
  if (!row) return null;
  return {
    id: row.id,
    displayName: row.display_name,
    email: row.email,
    role: row.role,
  };
}

async function userById(id: string | null): Promise<PersonRef | null> {
  if (!id) return null;
  const result = await query<UserRow>(
    `SELECT id, display_name, email, role FROM users WHERE id = $1`,
    [id],
  );
  return toPerson(result.rows[0]);
}

/** Last audit actor for matching actions on this entity. */
async function lastActorForActions(
  entityId: string,
  actions: string[],
): Promise<PersonRef | null> {
  const result = await query<{ actor_user_id: string | null; actor_email: string | null }>(
    `SELECT actor_user_id, actor_email
     FROM audit_log
     WHERE entity_id = $1 AND action = ANY($2::text[])
     ORDER BY created_at DESC
     LIMIT 1`,
    [entityId, actions],
  );
  const row = result.rows[0];
  if (!row) return null;
  if (row.actor_user_id) return userById(row.actor_user_id);
  if (row.actor_email) {
    const byEmail = await query<UserRow>(
      `SELECT id, display_name, email, role FROM users WHERE email = $1`,
      [row.actor_email],
    );
    if (byEmail.rows[0]) return toPerson(byEmail.rows[0]);
    return {
      id: "",
      displayName: row.actor_email,
      email: row.actor_email,
      role: "",
    };
  }
  return null;
}

/**
 * People shown on Edit/review:
 * - Editor: current author (created_by)
 * - Reviewer: last who approved / requested changes / rejected;
 *   falls back to review_owner when no review action yet (legacy / assigned owner)
 * - Publisher: last who published (no separate Publisher role in MVP)
 */
export async function getItemPeopleMeta(contentItemId: string): Promise<ItemPeopleMeta> {
  const item = await query<{
    created_by: string;
    content_type: string;
    review_owner_id: string | null;
  }>(
    `SELECT created_by, content_type, review_owner_id FROM content_items WHERE id = $1`,
    [contentItemId],
  );
  const row = item.rows[0];
  if (!row) {
    return { editor: null, reviewer: null, publisher: null, reviewOwner: null };
  }

  const t = row.content_type;
  const editor = await userById(row.created_by);
  const lastReviewer = await lastActorForActions(contentItemId, [
    `${t}.approve`,
    `${t}.changes_requested`,
    `${t}.reject`,
  ]);
  const publisher = await lastActorForActions(contentItemId, [`${t}.publish`]);
  const reviewOwner = await userById(row.review_owner_id);
  const reviewer = lastReviewer ?? reviewOwner;

  return { editor, reviewer, publisher, reviewOwner };
}
