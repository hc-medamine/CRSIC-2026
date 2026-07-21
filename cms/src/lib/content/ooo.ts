import { query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

export type AwayUserRow = {
  id: string;
  email: string;
  display_name: string;
  role: "super_admin" | "editor" | "reviewer";
  is_away: boolean;
  away_until: Date | null;
  away_delegate_user_id: string | null;
  role_before_away: "super_admin" | "editor" | "reviewer" | null;
};

/** Clear expired Away (until-date passed): revert elevated Editor, clear flags. */
export async function clearAwayIfExpired(userId: string): Promise<boolean> {
  const result = await query<AwayUserRow>(
    `SELECT id, email, display_name, role, is_away, away_until, away_delegate_user_id, role_before_away
     FROM users WHERE id = $1`,
    [userId],
  );
  const row = result.rows[0];
  if (!row?.is_away || !row.away_until) return false;
  if (row.away_until.getTime() > Date.now()) return false;
  await clearAwayInternal(row, null);
  return true;
}

async function clearAwayInternal(
  row: AwayUserRow,
  actor: SessionUser | null,
): Promise<void> {
  if (row.away_delegate_user_id) {
    await query(
      `UPDATE users SET role = 'editor', updated_at = NOW()
       WHERE id = $1 AND role = 'reviewer'`,
      [row.away_delegate_user_id],
    );
  }

  await query(
    `UPDATE users SET
       is_away = FALSE,
       away_until = NULL,
       away_delegate_user_id = NULL,
       role_before_away = NULL,
       updated_at = NOW()
     WHERE id = $1`,
    [row.id],
  );

  await writeAudit({
    actor,
    actorEmail: actor?.email ?? row.email,
    action: "user.away_cleared",
    entityType: "user",
    entityId: row.id,
    summary: `Cleared Away for ${row.display_name}`,
    metadata: { delegateId: row.away_delegate_user_id },
  });
}

/** Load user from DB (after clearing expired Away on this user and any Away that elevated them). */
export async function refreshUserFromDb(userId: string): Promise<SessionUser | null> {
  await clearAwayIfExpired(userId);
  // Also clear Away for anyone who elevated this user if their until passed
  const elevators = await query<{ id: string }>(
    `SELECT id FROM users WHERE is_away = TRUE AND away_delegate_user_id = $1`,
    [userId],
  );
  for (const e of elevators.rows) {
    await clearAwayIfExpired(e.id);
  }

  const result = await query<{
    id: string;
    email: string;
    display_name: string;
    role: "super_admin" | "editor" | "reviewer";
    is_active: boolean;
  }>(
    `SELECT id, email, display_name, role, is_active FROM users WHERE id = $1`,
    [userId],
  );
  const row = result.rows[0];
  if (!row || !row.is_active) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
  };
}

/** True if this user is currently Away (review actions frozen). */
export async function isUserAwayFrozen(userId: string): Promise<boolean> {
  await clearAwayIfExpired(userId);
  const result = await query<{ is_away: boolean }>(
    `SELECT is_away FROM users WHERE id = $1`,
    [userId],
  );
  return Boolean(result.rows[0]?.is_away);
}

export async function assertNotAwayFrozen(user: SessionUser): Promise<void> {
  if (await isUserAwayFrozen(user.id)) {
    throw new Error(
      "You are marked Away (OOO). Review actions are frozen until Away is cleared or the until-date passes.",
    );
  }
}

export async function listActiveEditors(): Promise<
  { id: string; display_name: string; email: string }[]
> {
  const result = await query<{ id: string; display_name: string; email: string }>(
    `SELECT id, display_name, email FROM users
     WHERE is_active = TRUE AND role = 'editor'
     ORDER BY display_name ASC`,
  );
  return result.rows;
}

/**
 * Set Away for a Reviewer: elevate one Editor to Reviewer for the duration.
 * Self-service (Reviewer) or Super Admin override.
 */
export async function setAway(
  actor: SessionUser,
  targetReviewerId: string,
  opts: { until: Date | null; elevateEditorId: string },
): Promise<void> {
  if (actor.role !== "super_admin" && actor.id !== targetReviewerId) {
    throw new Error("Only the Reviewer themselves or Super Admin can set Away");
  }
  if (actor.role !== "super_admin" && actor.role !== "reviewer") {
    throw new Error("Only Reviewers (or Super Admin) can set Away");
  }

  await clearAwayIfExpired(targetReviewerId);

  const target = await query<AwayUserRow>(
    `SELECT id, email, display_name, role, is_away, away_until, away_delegate_user_id, role_before_away
     FROM users WHERE id = $1 AND is_active = TRUE`,
    [targetReviewerId],
  );
  const row = target.rows[0];
  if (!row) throw new Error("User not found");
  if (row.role !== "reviewer" && actor.role !== "super_admin") {
    throw new Error("Away applies to Reviewer accounts");
  }
  if (row.role === "super_admin") {
    throw new Error("Super Admin cannot be set Away as a Reviewer delegate source");
  }
  if (row.role !== "reviewer") {
    throw new Error("Target must be a Reviewer");
  }
  if (row.is_away) {
    throw new Error("Already Away — clear Away first");
  }

  const editor = await query<{ id: string; role: string; display_name: string; is_active: boolean }>(
    `SELECT id, role, display_name, is_active FROM users WHERE id = $1`,
    [opts.elevateEditorId],
  );
  const ed = editor.rows[0];
  if (!ed || !ed.is_active) throw new Error("Elevate target not found");
  if (ed.role !== "editor") {
    throw new Error("OOO elevate target must be an active Editor (not Super Admin)");
  }
  if (ed.id === row.id) throw new Error("Cannot elevate self");

  // Elevate Editor → Reviewer
  await query(
    `UPDATE users SET role = 'reviewer', updated_at = NOW() WHERE id = $1`,
    [ed.id],
  );

  await query(
    `UPDATE users SET
       is_away = TRUE,
       away_until = $2,
       away_delegate_user_id = $3,
       role_before_away = 'reviewer',
       updated_at = NOW()
     WHERE id = $1`,
    [row.id, opts.until, ed.id],
  );

  await writeAudit({
    actor,
    action: "user.away_set",
    entityType: "user",
    entityId: row.id,
    summary: `Away set for ${row.display_name}; elevated ${ed.display_name} to Reviewer`,
    metadata: {
      until: opts.until?.toISOString() ?? null,
      elevateEditorId: ed.id,
    },
  });

  // Notify Away Reviewer + all Editors + elevated
  const editors = await listActiveEditors();
  const notifyIds = new Set<string>([row.id, ed.id, ...editors.map((e) => e.id)]);
  const untilLabel = opts.until ? opts.until.toISOString().slice(0, 10) : "manual clear";
  for (const uid of notifyIds) {
    await createNotification({
      userId: uid,
      type: "user.away_set",
      title: "Reviewer Away (OOO)",
      body: `${row.display_name} is Away until ${untilLabel}. ${ed.display_name} is temporary Reviewer.`,
      linkPath: "/dashboard",
    });
  }
}

export async function clearAway(actor: SessionUser, targetReviewerId: string): Promise<void> {
  if (actor.role !== "super_admin" && actor.id !== targetReviewerId) {
    throw new Error("Only the Reviewer themselves or Super Admin can clear Away");
  }
  const target = await query<AwayUserRow>(
    `SELECT id, email, display_name, role, is_away, away_until, away_delegate_user_id, role_before_away
     FROM users WHERE id = $1`,
    [targetReviewerId],
  );
  const row = target.rows[0];
  if (!row) throw new Error("User not found");
  if (!row.is_away) throw new Error("User is not Away");
  await clearAwayInternal(row, actor);
}

export async function getAwayState(userId: string): Promise<{
  isAway: boolean;
  awayUntil: string | null;
  awayDelegateUserId: string | null;
  awayDelegateName: string | null;
}> {
  await clearAwayIfExpired(userId);
  const result = await query<{
    is_away: boolean;
    away_until: Date | null;
    away_delegate_user_id: string | null;
    delegate_name: string | null;
  }>(
    `SELECT u.is_away, u.away_until, u.away_delegate_user_id, d.display_name AS delegate_name
     FROM users u
     LEFT JOIN users d ON d.id = u.away_delegate_user_id
     WHERE u.id = $1`,
    [userId],
  );
  const row = result.rows[0];
  return {
    isAway: Boolean(row?.is_away),
    awayUntil: row?.away_until?.toISOString() ?? null,
    awayDelegateUserId: row?.away_delegate_user_id ?? null,
    awayDelegateName: row?.delegate_name ?? null,
  };
}

/**
 * Recipients for a notification aimed at a Reviewer (or SA), applying OOO fan-out:
 * Away Reviewer + all Editors + elevated delegate (Decision 4B / T3 N2).
 * Future: department-scoped Editors when org notify routing lands.
 */
export async function expandOooNotifyTargets(primaryUserIds: string[]): Promise<string[]> {
  const ids = new Set<string>();
  for (const id of primaryUserIds) {
    await clearAwayIfExpired(id);
    ids.add(id);
    const away = await query<{
      is_away: boolean;
      away_delegate_user_id: string | null;
    }>(`SELECT is_away, away_delegate_user_id FROM users WHERE id = $1`, [id]);
    const row = away.rows[0];
    if (row?.is_away) {
      if (row.away_delegate_user_id) ids.add(row.away_delegate_user_id);
      const editors = await listActiveEditors();
      for (const e of editors) ids.add(e.id);
    }
  }
  return [...ids];
}
